"""
Property-based tests for CRUD round trip across all models.

**Validates: Requirements 12.2**
"""
import uuid

from django.test import override_settings
from django.utils import timezone
from hypothesis import given, settings as hypothesis_settings
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase

from accounts.models import Project, User


# --- Reusable strategies ---

text_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N')),
    min_size=1,
    max_size=100,
).map(lambda s: s.strip()).filter(lambda s: len(s) > 0)

email_strategy = st.emails().filter(lambda e: len(e) <= 200)

facility_type_strategy = st.sampled_from(['fitness', 'parking', 'meeting_room', 'pool', 'garden'])

priority_strategy = st.sampled_from(['normal', 'important', 'emergency'])


def _unique_email(prefix='user'):
    return f'{prefix}_{uuid.uuid4().hex[:12]}@example.com'


@override_settings(TEST_MODE=True)
class CRUDRoundTripTest(TestCase):
    """
    Property 22: CRUD round trip สำหรับทุก model

    For each model type, creating a record via the API and then reading it
    back must return the same data that was submitted.

    **Validates: Requirements 12.2**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Test Project', address='Addr')
        self.juristic_uid = uuid.uuid4()
        self.juristic_user = User.objects.create(
            email=_unique_email('juristic_crud'),
            full_name='Juristic CRUD',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_uid,
            project=self.project,
        )
        self.resident_uid = uuid.uuid4()
        self.resident_user = User.objects.create(
            email=_unique_email('resident_crud'),
            full_name='Resident CRUD',
            role='resident',
            status='approved',
            supabase_uid=self.resident_uid,
            unit_number='A101',
            project=self.project,
        )
        self.auth_juristic = f'Bearer {self.juristic_uid}'
        self.auth_resident = f'Bearer {self.resident_uid}'

    @given(
        full_name=text_strategy,
        email=email_strategy,
    )
    @hypothesis_settings(max_examples=20, deadline=5000)
    def test_user_create_read_round_trip(self, full_name, email):
        """
        Create a user via register API, then read back via user list.

        **Validates: Requirements 12.2**
        """
        unique_email = f'{uuid.uuid4().hex[:8]}_{email}'
        if len(unique_email) > 255:
            unique_email = unique_email[:255]

        resp = self.client.post(
            '/api/auth/register/',
            data={
                'email': unique_email,
                'full_name': full_name,
                'phone': '0812345678',
                'unit_number': 'A101',
                'project_id': str(self.project.id),
            },
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 201, resp.json())
        created = resp.json()

        # Read back via user list
        list_resp = self.client.get(
            '/api/users/',
            HTTP_AUTHORIZATION=self.auth_juristic,
        )
        self.assertEqual(list_resp.status_code, 200)
        users = list_resp.json()
        found = [u for u in users if u['id'] == created['id']]
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]['email'], unique_email)
        self.assertEqual(found[0]['full_name'], full_name)

    @given(
        name=text_strategy,
        facility_type=facility_type_strategy,
    )
    @hypothesis_settings(max_examples=20, deadline=5000)
    def test_facility_create_read_round_trip(self, name, facility_type):
        """
        Create a facility via ORM, then read back via facility list API.

        **Validates: Requirements 12.2**
        """
        from facilities.models import Facility

        facility = Facility.objects.create(
            project=self.project,
            name=name,
            type=facility_type,
            description='Test facility',
            is_active=True,
        )

        list_resp = self.client.get(
            '/api/facilities/',
            HTTP_AUTHORIZATION=self.auth_resident,
        )
        self.assertEqual(list_resp.status_code, 200)
        facilities = list_resp.json()
        found = [f for f in facilities if f['id'] == str(facility.id)]
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]['name'], name)
        self.assertEqual(found[0]['type'], facility_type)

    @given(
        recipient_name=text_strategy,
        courier=text_strategy,
    )
    @hypothesis_settings(max_examples=20, deadline=5000)
    def test_parcel_create_read_round_trip(self, recipient_name, courier):
        """
        Create a parcel via API, then read back via parcel list.

        **Validates: Requirements 12.2**
        """
        resp = self.client.post(
            '/api/parcels/',
            data={
                'project_id': str(self.project.id),
                'recipient_name': recipient_name,
                'unit_number': 'A101',
                'courier': courier,
                'tracking_number': f'TRK{uuid.uuid4().hex[:8]}',
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=self.auth_juristic,
        )
        self.assertEqual(resp.status_code, 201, resp.json())
        created = resp.json()

        list_resp = self.client.get(
            '/api/parcels/',
            HTTP_AUTHORIZATION=self.auth_juristic,
        )
        self.assertEqual(list_resp.status_code, 200)
        parcels = list_resp.json()
        found = [p for p in parcels if p['id'] == created['id']]
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]['recipient_name'], recipient_name)
        self.assertEqual(found[0]['courier'], courier)

    @given(
        content=text_strategy,
        post_type=st.sampled_from(['normal', 'announcement', 'alert']),
    )
    @hypothesis_settings(max_examples=20, deadline=5000)
    def test_post_create_read_round_trip(self, content, post_type):
        """
        Create a post via API, then read back via post list.

        **Validates: Requirements 12.2**
        """
        resp = self.client.post(
            '/api/posts/',
            data={
                'content': content,
                'post_type': post_type,
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=self.auth_resident,
        )
        self.assertEqual(resp.status_code, 201, resp.json())
        created = resp.json()

        list_resp = self.client.get(
            '/api/posts/',
            HTTP_AUTHORIZATION=self.auth_resident,
        )
        self.assertEqual(list_resp.status_code, 200)
        posts = list_resp.json()
        found = [p for p in posts if p['id'] == created['id']]
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]['content'], content)
        self.assertEqual(found[0]['post_type'], post_type)

    @given(
        name=text_strategy,
        description=text_strategy,
        location=text_strategy,
    )
    @hypothesis_settings(max_examples=20, deadline=10000)
    def test_event_create_read_round_trip(self, name, description, location):
        """
        Create an event via API, then read back via event list.

        **Validates: Requirements 12.2**
        """
        event_date = timezone.now().isoformat()
        resp = self.client.post(
            '/api/events/',
            data={
                'title': name,
                'description': description,
                'event_date': event_date,
                'location': location,
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=self.auth_juristic,
        )
        self.assertEqual(resp.status_code, 201, resp.json())
        created = resp.json()

        list_resp = self.client.get(
            '/api/events/',
            HTTP_AUTHORIZATION=self.auth_juristic,
        )
        self.assertEqual(list_resp.status_code, 200)
        events = list_resp.json()
        found = [e for e in events if e['id'] == created['id']]
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]['title'], name)
        self.assertEqual(found[0]['description'], description)

    @given(
        title=text_strategy,
        content=text_strategy,
        priority=priority_strategy,
    )
    @hypothesis_settings(max_examples=20, deadline=10000)
    def test_announcement_create_read_round_trip(self, title, content, priority):
        """
        Create an announcement via API, then read back via announcement list.

        **Validates: Requirements 12.2**
        """
        resp = self.client.post(
            '/api/announcements/',
            data={
                'title': title,
                'content': content,
                'priority': priority,
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=self.auth_juristic,
        )
        self.assertEqual(resp.status_code, 201, resp.json())
        created = resp.json()

        list_resp = self.client.get(
            '/api/announcements/',
            HTTP_AUTHORIZATION=self.auth_juristic,
        )
        self.assertEqual(list_resp.status_code, 200)
        announcements = list_resp.json()
        found = [a for a in announcements if a['id'] == created['id']]
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]['title'], title)
        self.assertEqual(found[0]['content'], content)
        self.assertEqual(found[0]['priority'], priority)
