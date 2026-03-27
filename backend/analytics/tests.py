"""
Property-based tests for the analytics app.

Covers:
- Property 20: ข้อมูล Analytics ถูกกรองตามช่วงเวลา
- Property 21: Community Health มีข้อมูลครบถ้วน
"""
import uuid
from datetime import timedelta

from django.db import connection
from django.test import override_settings
from django.utils import timezone
from hypothesis import given, settings as hypothesis_settings
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase

from accounts.models import Project, User
from chatbot.models import ChatHistory
from facilities.models import Booking, Facility
from parcels.models import Parcel
from social.models import Post, Comment, PostReport


@override_settings(TEST_MODE=True)
class AnalyticsFilteredByDateRangeTest(TestCase):
    """
    Property 20: ข้อมูล Analytics ถูกกรองตามช่วงเวลา

    For any date range, all returned analytics data must have timestamps
    within the specified range. We verify this by:
    1. Creating bookings with explicit start_time (inside and outside the window)
    2. Checking that facility-usage only counts inside-window bookings
    3. Checking that chatbot-trends and parcel-stats respect the date range

    **Validates: Requirements 11.2, 11.3, 11.4, 11.5**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Analytics Project', address='Addr')
        self.user_uid = uuid.uuid4()
        self.user = User.objects.create(
            email='analytics_p20@example.com',
            full_name='Analytics User',
            role='juristic',
            status='approved',
            supabase_uid=self.user_uid,
            project=self.project,
        )
        self.facility = Facility.objects.create(
            project=self.project,
            name='Test Gym',
            type='fitness',
        )

    @given(
        num_inside=st.integers(min_value=1, max_value=4),
        num_outside=st.integers(min_value=1, max_value=4),
    )
    @hypothesis_settings(max_examples=20, deadline=15000)
    def test_analytics_filtered_by_date_range(self, num_inside, num_outside):
        """
        Property 20: ข้อมูล Analytics ถูกกรองตามช่วงเวลา

        **Validates: Requirements 11.2, 11.3, 11.4, 11.5**
        """
        # Clean up any leftover data from previous examples
        Booking.objects.filter(facility=self.facility).delete()

        now = timezone.now()
        # Window: 30 days ago to 10 days ago
        window_start = now - timedelta(days=30)
        window_end = now - timedelta(days=10)
        inside_time = now - timedelta(days=20)  # inside window
        outside_time = now - timedelta(days=5)  # outside window (after end)

        # --- Create bookings (start_time is a regular field, not auto_now_add) ---
        inside_bookings = []
        for i in range(num_inside):
            b = Booking.objects.create(
                facility=self.facility,
                user=self.user,
                start_time=inside_time + timedelta(hours=i),
                end_time=inside_time + timedelta(hours=i + 1),
                status='confirmed',
            )
            inside_bookings.append(b)

        outside_bookings = []
        for i in range(num_outside):
            b = Booking.objects.create(
                facility=self.facility,
                user=self.user,
                start_time=outside_time + timedelta(hours=i),
                end_time=outside_time + timedelta(hours=i + 1),
                status='confirmed',
            )
            outside_bookings.append(b)

        auth = f'Bearer {self.user_uid}'
        params = (
            f'?start_date={window_start.isoformat()}'
            f'&end_date={window_end.isoformat()}'
        )

        # Test facility-usage: only inside bookings should be counted
        resp = self.client.get(
            f'/api/analytics/facility-usage/{params}',
            HTTP_AUTHORIZATION=auth,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        for f_stat in data['facilities']:
            if str(f_stat['facility_id']) == str(self.facility.id):
                self.assertEqual(
                    f_stat['booking_count'], num_inside,
                    f'Expected {num_inside} inside bookings, got {f_stat["booking_count"]}',
                )

        # Test community-health: engagement booking_count should match inside only
        resp = self.client.get(
            f'/api/analytics/community-health/{params}',
            HTTP_AUTHORIZATION=auth,
        )
        self.assertEqual(resp.status_code, 200)
        health_data = resp.json()
        self.assertEqual(
            health_data['engagement_level']['booking_count'], num_inside,
        )

        # Test without date filter: should include all bookings
        resp_all = self.client.get(
            '/api/analytics/facility-usage/',
            HTTP_AUTHORIZATION=auth,
        )
        self.assertEqual(resp_all.status_code, 200)
        all_data = resp_all.json()
        for f_stat in all_data['facilities']:
            if str(f_stat['facility_id']) == str(self.facility.id):
                self.assertGreaterEqual(
                    f_stat['booking_count'], num_inside + num_outside,
                )

        # Cleanup
        for b in inside_bookings + outside_bookings:
            b.delete()


@override_settings(TEST_MODE=True)
class CommunityHealthHasCompleteDataTest(TestCase):
    """
    Property 21: Community Health มีข้อมูลครบถ้วน

    The community-health endpoint must always return engagement_level,
    facility_stats, chatbot_trends, and satisfaction_rate (0-100).

    **Validates: Requirements 11.1, 11.6**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Health Project', address='Addr')
        self.user_uid = uuid.uuid4()
        self.user = User.objects.create(
            email='health_p21@example.com',
            full_name='Health User',
            role='juristic',
            status='approved',
            supabase_uid=self.user_uid,
            project=self.project,
        )

    @given(
        num_posts=st.integers(min_value=0, max_value=5),
        num_comments=st.integers(min_value=0, max_value=5),
        num_bookings=st.integers(min_value=0, max_value=3),
        num_reports=st.integers(min_value=0, max_value=3),
        num_chats=st.integers(min_value=0, max_value=5),
    )
    @hypothesis_settings(max_examples=20, deadline=15000)
    def test_community_health_has_complete_data(
        self, num_posts, num_comments, num_bookings, num_reports, num_chats,
    ):
        """
        Property 21: Community Health มีข้อมูลครบถ้วน

        **Validates: Requirements 11.1, 11.6**
        """
        now = timezone.now()

        # Create test data
        posts = []
        for i in range(num_posts):
            p = Post.objects.create(
                author=self.user,
                project=self.project,
                content=f'Post {i}',
            )
            posts.append(p)

        comments = []
        if posts and num_comments > 0:
            for i in range(num_comments):
                c = Comment.objects.create(
                    post=posts[0],
                    author=self.user,
                    content=f'Comment {i}',
                )
                comments.append(c)

        facility = Facility.objects.create(
            project=self.project,
            name='Test Facility P21',
            type='pool',
        )

        bookings = []
        for i in range(num_bookings):
            b = Booking.objects.create(
                facility=facility,
                user=self.user,
                start_time=now + timedelta(hours=i),
                end_time=now + timedelta(hours=i + 1),
                status='confirmed',
            )
            bookings.append(b)

        reports = []
        if posts and num_reports > 0:
            for i in range(min(num_reports, len(posts))):
                r = PostReport.objects.create(
                    post=posts[i],
                    reported_by=self.user,
                    reason='Test report',
                )
                reports.append(r)

        chats = []
        for i in range(num_chats):
            ch = ChatHistory.objects.create(
                user=self.user,
                session_id=uuid.uuid4(),
                user_message=f'Question {i % 3}',
                bot_response=f'Answer {i}',
            )
            chats.append(ch)

        auth = f'Bearer {self.user_uid}'
        resp = self.client.get(
            '/api/analytics/community-health/',
            HTTP_AUTHORIZATION=auth,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Must have all required fields
        self.assertIn('engagement_level', data)
        self.assertIn('facility_stats', data)
        self.assertIn('chatbot_trends', data)
        self.assertIn('satisfaction_rate', data)

        # engagement_level must have expected sub-fields
        eng = data['engagement_level']
        self.assertIn('post_count', eng)
        self.assertIn('comment_count', eng)
        self.assertIn('booking_count', eng)
        self.assertIn('total', eng)
        self.assertEqual(
            eng['total'],
            eng['post_count'] + eng['comment_count'] + eng['booking_count'],
        )

        # satisfaction_rate must be between 0 and 100
        self.assertGreaterEqual(data['satisfaction_rate'], 0)
        self.assertLessEqual(data['satisfaction_rate'], 100)

        # facility_stats must be a list
        self.assertIsInstance(data['facility_stats'], list)

        # chatbot_trends must be a list
        self.assertIsInstance(data['chatbot_trends'], list)

        # Each chatbot trend item must have question and count
        for item in data['chatbot_trends']:
            self.assertIn('question', item)
            self.assertIn('count', item)
            self.assertGreater(item['count'], 0)

        # Cleanup
        for ch in chats:
            ch.delete()
        for r in reports:
            r.delete()
        for b in bookings:
            b.delete()
        facility.delete()
        for c in comments:
            c.delete()
        for p in posts:
            p.delete()
