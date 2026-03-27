"""
Property-based tests for the events app.

Covers:
- Property 10: การเผยแพร่ประกาศ/กิจกรรมสร้าง notification ให้ทุกคนในโครงการ
- Property 18: กิจกรรมและประกาศมีข้อมูลครบถ้วน
- Property 19: การเรียงลำดับกิจกรรมและประกาศ
"""
import uuid

from django.test import override_settings
from django.utils import timezone
from hypothesis import given, settings as hypothesis_settings
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase

from accounts.models import Project, User
from notifications.models import Notification


# --- Reusable strategies ---

title_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'Zs', 'P')),
    min_size=1,
    max_size=100,
).filter(lambda s: s.strip() != '')

content_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'Zs', 'P')),
    min_size=1,
    max_size=200,
).filter(lambda s: s.strip() != '')

location_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'Zs')),
    min_size=1,
    max_size=100,
).filter(lambda s: s.strip() != '')

priority_strategy = st.sampled_from(['normal', 'important', 'emergency'])

num_residents_strategy = st.integers(min_value=1, max_value=5)


@override_settings(TEST_MODE=True)
class PublishCreatesNotificationsForAllResidentsTest(TestCase):
    """
    Property 10: การเผยแพร่ประกาศ/กิจกรรมสร้าง notification ให้ทุกคนในโครงการ

    For any published announcement or event, the number of notifications
    created must equal the number of approved residents in that project.

    **Validates: Requirements 6.4, 10.3**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Test Project', address='Addr')
        self.juristic_uid = uuid.uuid4()
        self.juristic_user = User.objects.create(
            email='juristic_events@example.com',
            full_name='Juristic Events',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_uid,
            project=self.project,
        )

    @given(
        title=title_strategy,
        description=content_strategy,
        num_residents=num_residents_strategy,
    )
    @hypothesis_settings(max_examples=30, deadline=10000)
    def test_publish_creates_notifications_for_all_residents(self, title, description, num_residents):
        """
        Property 10: การเผยแพร่ประกาศ/กิจกรรมสร้าง notification ให้ทุกคนในโครงการ

        **Validates: Requirements 6.4, 10.3**
        """
        # Create N approved residents
        residents = []
        for i in range(num_residents):
            uid = uuid.uuid4()
            r = User.objects.create(
                email=f'resident_p10_{uid}@example.com',
                full_name=f'Resident {i}',
                role='resident',
                status='approved',
                supabase_uid=uid,
                project=self.project,
            )
            residents.append(r)

        notif_count_before = Notification.objects.filter(
            type='event',
            user__project=self.project,
        ).count()

        auth = f'Bearer {self.juristic_uid}'
        event_date = timezone.now().isoformat()

        # Create an event via API
        resp = self.client.post(
            '/api/events/',
            data={
                'title': title,
                'description': description,
                'event_date': event_date,
                'location': 'Test Location',
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=auth,
        )
        self.assertEqual(resp.status_code, 201, resp.json())

        notif_count_after = Notification.objects.filter(
            type='event',
            user__project=self.project,
        ).count()

        new_notifications = notif_count_after - notif_count_before
        # Number of new notifications must equal number of approved residents
        # (juristic users are NOT residents, so they don't get notified)
        approved_resident_count = User.objects.filter(
            project=self.project,
            role='resident',
            status='approved',
        ).count()
        self.assertEqual(
            new_notifications,
            approved_resident_count,
            f'Expected {approved_resident_count} notifications, got {new_notifications}',
        )

        # Clean up residents for next iteration
        for r in residents:
            r.delete()


@override_settings(TEST_MODE=True)
class EventAndAnnouncementHaveRequiredFieldsTest(TestCase):
    """
    Property 18: กิจกรรมและประกาศมีข้อมูลครบถ้วนตามที่กำหนด

    For any created event, it must have title, description, event_date, location.
    For any created announcement, it must have title, content, priority.

    **Validates: Requirements 10.1, 10.2**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Test Project', address='Addr')
        self.juristic_uid = uuid.uuid4()
        self.juristic_user = User.objects.create(
            email='juristic_p18@example.com',
            full_name='Juristic P18',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_uid,
            project=self.project,
        )
        # Need at least one resident so notifications don't fail
        self.resident_uid = uuid.uuid4()
        User.objects.create(
            email='resident_p18@example.com',
            full_name='Resident P18',
            role='resident',
            status='approved',
            supabase_uid=self.resident_uid,
            project=self.project,
        )

    @given(
        title=title_strategy,
        description=content_strategy,
        location=location_strategy,
        priority=priority_strategy,
        ann_title=title_strategy,
        ann_content=content_strategy,
    )
    @hypothesis_settings(max_examples=30, deadline=10000)
    def test_event_and_announcement_have_required_fields(
        self, title, description, location, priority, ann_title, ann_content,
    ):
        """
        Property 18: กิจกรรมและประกาศมีข้อมูลครบถ้วนตามที่กำหนด

        **Validates: Requirements 10.1, 10.2**
        """
        auth = f'Bearer {self.juristic_uid}'
        event_date = timezone.now().isoformat()

        # Create event
        event_resp = self.client.post(
            '/api/events/',
            data={
                'title': title,
                'description': description,
                'event_date': event_date,
                'location': location,
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=auth,
        )
        self.assertEqual(event_resp.status_code, 201, event_resp.json())
        event_data = event_resp.json()

        # Event must have all required fields
        self.assertIn('title', event_data)
        self.assertEqual(event_data['title'], title)
        self.assertIn('description', event_data)
        self.assertIn('event_date', event_data)
        self.assertIsNotNone(event_data['event_date'])
        self.assertIn('location', event_data)

        # Create announcement
        ann_resp = self.client.post(
            '/api/announcements/',
            data={
                'title': ann_title,
                'content': ann_content,
                'priority': priority,
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=auth,
        )
        self.assertEqual(ann_resp.status_code, 201, ann_resp.json())
        ann_data = ann_resp.json()

        # Announcement must have all required fields
        self.assertIn('title', ann_data)
        self.assertEqual(ann_data['title'], ann_title)
        self.assertIn('content', ann_data)
        self.assertEqual(ann_data['content'], ann_content)
        self.assertIn('priority', ann_data)
        self.assertIn(ann_data['priority'], ['normal', 'important', 'emergency'])


@override_settings(TEST_MODE=True)
class EventsAnnouncementsSortedByPriorityThenDateTest(TestCase):
    """
    Property 19: การเรียงลำดับกิจกรรมและประกาศ

    For any list of announcements, the ordering must be by priority
    (emergency > important > normal) first, then by created_at DESC.

    **Validates: Requirements 10.4**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Test Project', address='Addr')
        self.juristic_uid = uuid.uuid4()
        self.juristic_user = User.objects.create(
            email='juristic_p19@example.com',
            full_name='Juristic P19',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_uid,
            project=self.project,
        )
        # Need at least one resident
        self.resident_uid = uuid.uuid4()
        User.objects.create(
            email='resident_p19@example.com',
            full_name='Resident P19',
            role='resident',
            status='approved',
            supabase_uid=self.resident_uid,
            project=self.project,
        )

    @given(
        priorities=st.lists(
            priority_strategy,
            min_size=3,
            max_size=8,
        ).filter(lambda ps: len(set(ps)) >= 2),  # at least 2 different priorities
    )
    @hypothesis_settings(max_examples=20, deadline=15000)
    def test_events_announcements_sorted_by_priority_then_date(self, priorities):
        """
        Property 19: การเรียงลำดับกิจกรรมและประกาศ

        **Validates: Requirements 10.4**
        """
        auth = f'Bearer {self.juristic_uid}'
        priority_rank = {'emergency': 0, 'important': 1, 'normal': 2}

        # Create announcements with different priorities
        for i, priority in enumerate(priorities):
            resp = self.client.post(
                '/api/announcements/',
                data={
                    'title': f'Announcement {i}',
                    'content': f'Content for announcement {i}',
                    'priority': priority,
                },
                content_type='application/json',
                HTTP_AUTHORIZATION=auth,
            )
            self.assertEqual(resp.status_code, 201, resp.json())

        # Fetch announcements
        list_resp = self.client.get(
            '/api/announcements/',
            HTTP_AUTHORIZATION=auth,
        )
        self.assertEqual(list_resp.status_code, 200)
        announcements = list_resp.json()

        # Verify ordering: priority first, then created_at DESC
        for i in range(len(announcements) - 1):
            curr = announcements[i]
            nxt = announcements[i + 1]
            curr_rank = priority_rank[curr['priority']]
            nxt_rank = priority_rank[nxt['priority']]

            if curr_rank > nxt_rank:
                self.fail(
                    f'Announcement at index {i} (priority={curr["priority"]}) '
                    f'should come before index {i+1} (priority={nxt["priority"]}). '
                    f'Expected emergency > important > normal ordering.'
                )
            elif curr_rank == nxt_rank:
                # Same priority: should be ordered by created_at DESC
                self.assertGreaterEqual(
                    curr['created_at'],
                    nxt['created_at'],
                    f'Announcements with same priority ({curr["priority"]}) '
                    f'should be ordered by created_at DESC.',
                )
