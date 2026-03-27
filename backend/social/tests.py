"""
Property-based tests for the social app.

Covers:
- Property 11: การสร้างโพสต์และการมองเห็นภายในโครงการ
- Property 12: Like เป็น idempotent ต่อผู้ใช้
- Property 13: Share link เป็น unique และเข้าถึงได้เฉพาะผู้ที่ authenticated
- Property 14: โพสต์ประเภท alert ถูกปักหมุดที่ด้านบน feed
- Property 15: การรายงานโพสต์สร้าง notification ให้นิติบุคคล
"""
import uuid

from django.test import override_settings
from hypothesis import given, settings as hypothesis_settings
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase

from accounts.models import Project, User
from notifications.models import Notification
from social.models import Post, Like


# --- Reusable strategies ---

content_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'Zs', 'P')),
    min_size=1,
    max_size=200,
).filter(lambda s: s.strip() != '')

post_type_strategy = st.sampled_from(['normal', 'announcement', 'alert'])

reason_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'Zs')),
    min_size=0,
    max_size=100,
)


@override_settings(TEST_MODE=True)
class PostVisibilityWithinProjectTest(TestCase):
    """
    Property 11: การสร้างโพสต์และการมองเห็นภายในโครงการ

    For any post created in project A, it must appear in the feed of users
    in project A and must NOT appear in the feed of users in project B.

    **Validates: Requirements 7.1, 7.2, 7.7**
    """

    def setUp(self):
        self.project_a = Project.objects.create(name='Project A', address='Addr A')
        self.project_b = Project.objects.create(name='Project B', address='Addr B')

        self.uid_a = uuid.uuid4()
        self.user_a = User.objects.create(
            email='user_a@example.com',
            full_name='User A',
            role='resident',
            status='approved',
            supabase_uid=self.uid_a,
            project=self.project_a,
        )

        self.uid_b = uuid.uuid4()
        self.user_b = User.objects.create(
            email='user_b@example.com',
            full_name='User B',
            role='resident',
            status='approved',
            supabase_uid=self.uid_b,
            project=self.project_b,
        )

    @given(
        content=content_strategy,
        post_type=post_type_strategy,
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_post_visibility_within_project(self, content, post_type):
        """
        Property 11: การสร้างโพสต์และการมองเห็นภายในโครงการ

        **Validates: Requirements 7.1, 7.2, 7.7**
        """
        # Create a post in project A via API
        response = self.client.post(
            '/api/posts/',
            data={
                'content': content,
                'post_type': post_type,
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.uid_a}',
        )
        self.assertEqual(response.status_code, 201, response.json())
        created_post_id = response.json()['id']

        # User A (same project) must see the post in their feed
        feed_a = self.client.get(
            '/api/posts/',
            HTTP_AUTHORIZATION=f'Bearer {self.uid_a}',
        )
        self.assertEqual(feed_a.status_code, 200)
        feed_a_ids = [p['id'] for p in feed_a.json()]
        self.assertIn(created_post_id, feed_a_ids)

        # User B (different project) must NOT see the post
        feed_b = self.client.get(
            '/api/posts/',
            HTTP_AUTHORIZATION=f'Bearer {self.uid_b}',
        )
        self.assertEqual(feed_b.status_code, 200)
        feed_b_ids = [p['id'] for p in feed_b.json()]
        self.assertNotIn(created_post_id, feed_b_ids)


@override_settings(TEST_MODE=True)
class LikeIdempotentTest(TestCase):
    """
    Property 12: Like เป็น idempotent ต่อผู้ใช้

    For any post and any user, liking a post twice should toggle the like
    (like then unlike), so the like count after two toggles equals the
    original count.

    **Validates: Requirements 7.3**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Test Project', address='Addr')
        self.uid = uuid.uuid4()
        self.user = User.objects.create(
            email='liker@example.com',
            full_name='Liker',
            role='resident',
            status='approved',
            supabase_uid=self.uid,
            project=self.project,
        )

    @given(content=content_strategy)
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_like_idempotent(self, content):
        """
        Property 12: Like เป็น idempotent ต่อผู้ใช้

        **Validates: Requirements 7.3**
        """
        # Create a post
        post = Post.objects.create(
            author=self.user,
            project=self.project,
            post_type='normal',
            content=content,
            share_token=uuid.uuid4().hex[:32],
        )

        auth = f'Bearer {self.uid}'

        # First like → liked=True, like_count=1
        r1 = self.client.post(f'/api/posts/{post.id}/like/', HTTP_AUTHORIZATION=auth)
        self.assertEqual(r1.status_code, 200)
        self.assertTrue(r1.json()['liked'])
        self.assertEqual(r1.json()['like_count'], 1)

        # Second like (toggle) → liked=False, like_count=0
        r2 = self.client.post(f'/api/posts/{post.id}/like/', HTTP_AUTHORIZATION=auth)
        self.assertEqual(r2.status_code, 200)
        self.assertFalse(r2.json()['liked'])
        self.assertEqual(r2.json()['like_count'], 0)

        # DB should have no likes for this post+user
        self.assertFalse(
            Like.objects.filter(post=post, user=self.user).exists()
        )


@override_settings(TEST_MODE=True)
class ShareLinkUniqueAndAuthRequiredTest(TestCase):
    """
    Property 13: Share link เป็น unique และเข้าถึงได้เฉพาะผู้ที่ authenticated

    For any set of posts, each share_token must be unique. Additionally,
    unauthenticated requests to the share-link endpoint must be rejected.

    **Validates: Requirements 7.4, 7.5**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Test Project', address='Addr')
        self.uid = uuid.uuid4()
        self.user = User.objects.create(
            email='sharer@example.com',
            full_name='Sharer',
            role='resident',
            status='approved',
            supabase_uid=self.uid,
            project=self.project,
        )

    @given(
        contents=st.lists(content_strategy, min_size=2, max_size=5),
    )
    @hypothesis_settings(max_examples=20, deadline=10000)
    def test_share_link_unique_and_auth_required(self, contents):
        """
        Property 13: Share link เป็น unique และเข้าถึงได้เฉพาะผู้ที่ authenticated

        **Validates: Requirements 7.4, 7.5**
        """
        auth = f'Bearer {self.uid}'
        share_tokens = []

        for content in contents:
            # Create post via API (generates share_token)
            resp = self.client.post(
                '/api/posts/',
                data={'content': content, 'post_type': 'normal'},
                content_type='application/json',
                HTTP_AUTHORIZATION=auth,
            )
            self.assertEqual(resp.status_code, 201, resp.json())
            post_data = resp.json()
            token = post_data['share_token']
            self.assertIsNotNone(token)
            self.assertTrue(len(token) > 0)
            share_tokens.append(token)

            # Authenticated user can access share-link endpoint
            post_id = post_data['id']
            share_resp = self.client.get(
                f'/api/posts/{post_id}/share-link/',
                HTTP_AUTHORIZATION=auth,
            )
            self.assertEqual(share_resp.status_code, 200)
            self.assertEqual(share_resp.json()['share_token'], token)

        # All share tokens must be unique
        self.assertEqual(
            len(share_tokens),
            len(set(share_tokens)),
            f'Share tokens are not unique: {share_tokens}',
        )

        # Unauthenticated request must be rejected (no Authorization header)
        if share_tokens:
            post_id = Post.objects.filter(
                project=self.project
            ).first().id
            unauth_resp = self.client.get(f'/api/posts/{post_id}/share-link/')
            self.assertIn(
                unauth_resp.status_code,
                [401, 403],
                'Unauthenticated request should be rejected',
            )


@override_settings(TEST_MODE=True)
class AlertPostsPinnedAtTopTest(TestCase):
    """
    Property 14: โพสต์ประเภท alert ถูกปักหมุดที่ด้านบน feed

    For any feed containing both alert and non-alert posts, all alert
    posts must appear before all non-alert posts.

    **Validates: Requirements 7.8**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Test Project', address='Addr')
        self.uid = uuid.uuid4()
        self.user = User.objects.create(
            email='feeder@example.com',
            full_name='Feeder',
            role='resident',
            status='approved',
            supabase_uid=self.uid,
            project=self.project,
        )

    @given(
        post_types=st.lists(
            post_type_strategy,
            min_size=2,
            max_size=8,
        ).filter(
            lambda types: 'alert' in types and any(t != 'alert' for t in types)
        ),
    )
    @hypothesis_settings(max_examples=20, deadline=10000)
    def test_alert_posts_pinned_at_top(self, post_types):
        """
        Property 14: โพสต์ประเภท alert ถูกปักหมุดที่ด้านบน feed

        **Validates: Requirements 7.8**
        """
        auth = f'Bearer {self.uid}'

        # Create posts with the given types
        for i, pt in enumerate(post_types):
            resp = self.client.post(
                '/api/posts/',
                data={'content': f'Post {i} type {pt}', 'post_type': pt},
                content_type='application/json',
                HTTP_AUTHORIZATION=auth,
            )
            self.assertEqual(resp.status_code, 201, resp.json())

        # Fetch the feed
        feed_resp = self.client.get('/api/posts/', HTTP_AUTHORIZATION=auth)
        self.assertEqual(feed_resp.status_code, 200)
        feed = feed_resp.json()

        # Find the boundary: once we see a non-alert post, no alert should follow
        seen_non_alert = False
        for post in feed:
            is_alert = post['post_type'] == 'alert'
            if not is_alert:
                seen_non_alert = True
            if seen_non_alert and is_alert:
                self.fail(
                    'Alert post found after non-alert post in feed. '
                    'Alert posts must always appear at the top.'
                )


@override_settings(TEST_MODE=True)
class ReportCreatesNotificationForJuristicTest(TestCase):
    """
    Property 15: การรายงานโพสต์สร้าง notification ให้นิติบุคคล

    For any reported post, the system must create a 'report' notification
    for every approved juristic user in the same project.

    **Validates: Requirements 7.9**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Test Project', address='Addr')

        self.juristic_uid = uuid.uuid4()
        self.juristic_user = User.objects.create(
            email='juristic@example.com',
            full_name='Juristic Manager',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_uid,
            project=self.project,
        )

        self.reporter_uid = uuid.uuid4()
        self.reporter = User.objects.create(
            email='reporter@example.com',
            full_name='Reporter',
            role='resident',
            status='approved',
            supabase_uid=self.reporter_uid,
            project=self.project,
        )

    @given(
        content=content_strategy,
        reason=reason_strategy,
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_report_creates_notification_for_juristic(self, content, reason):
        """
        Property 15: การรายงานโพสต์สร้าง notification ให้นิติบุคคล

        **Validates: Requirements 7.9**
        """
        # Create a post
        post = Post.objects.create(
            author=self.reporter,
            project=self.project,
            post_type='normal',
            content=content,
            share_token=uuid.uuid4().hex[:32],
        )

        notif_count_before = Notification.objects.filter(
            user=self.juristic_user, type='report'
        ).count()

        # Report the post
        resp = self.client.post(
            f'/api/posts/{post.id}/report/',
            data={'reason': reason},
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.reporter_uid}',
        )
        self.assertEqual(resp.status_code, 201, resp.json())

        # A 'report' notification must exist for the juristic user
        notif_count_after = Notification.objects.filter(
            user=self.juristic_user, type='report'
        ).count()
        self.assertGreater(
            notif_count_after,
            notif_count_before,
            'No report notification was created for the juristic user',
        )

        # Verify the notification references the reported post
        latest_notif = Notification.objects.filter(
            user=self.juristic_user, type='report'
        ).order_by('-created_at').first()
        self.assertIsNotNone(latest_notif)
        self.assertIn(str(post.id), str(latest_notif.data.get('post_id', '')))
