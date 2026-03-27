"""
Property-based tests for the accounts app.

**Validates: Requirements 1.1, 1.2**
"""
import uuid

from django.test import override_settings
from hypothesis import given, settings as hypothesis_settings
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase

from accounts.models import Project, User
from notifications.models import Notification


# --- Hypothesis strategies for valid registration data ---

email_strategy = st.emails().filter(lambda e: len(e) <= 255)

full_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'Zs')),
    min_size=1,
    max_size=100,
).filter(lambda s: s.strip() != '')

phone_strategy = st.from_regex(r'0[0-9]{8,9}', fullmatch=True)

unit_number_strategy = st.from_regex(r'[A-Z]?[0-9]{1,4}/[0-9]{1,4}', fullmatch=True)


@override_settings(TEST_MODE=True)
class RegistrationCreatesUserPendingWithNotificationTest(TestCase):
    """
    Property 1: การลงทะเบียนสร้างผู้ใช้สถานะ pending พร้อมแจ้งเตือน

    For any valid registration data, the system must:
    1. Create a user with status='pending'
    2. Create a notification for juristic users in the same project

    **Validates: Requirements 1.1, 1.2**
    """

    def setUp(self):
        """Create a project and a juristic user as fixtures."""
        self.project = Project.objects.create(
            name='Test Project',
            address='123 Test Street',
        )
        self.juristic_user = User.objects.create(
            email='juristic@example.com',
            full_name='Juristic Manager',
            role='juristic',
            status='approved',
            project=self.project,
        )

    @given(
        email=email_strategy,
        full_name=full_name_strategy,
        phone=phone_strategy,
        unit_number=unit_number_strategy,
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_registration_creates_pending_user_with_notification(
        self, email, full_name, phone, unit_number
    ):
        """
        Property 1: การลงทะเบียนสร้างผู้ใช้สถานะ pending พร้อมแจ้งเตือน

        **Validates: Requirements 1.1, 1.2**
        """
        # Ensure email uniqueness across Hypothesis examples within this test
        unique_email = f"{uuid.uuid4().hex[:8]}_{email}"
        if len(unique_email) > 255:
            unique_email = unique_email[:255]

        response = self.client.post(
            '/api/auth/register/',
            data={
                'email': unique_email,
                'full_name': full_name,
                'phone': phone,
                'unit_number': unit_number,
                'project_id': str(self.project.id),
            },
            content_type='application/json',
        )

        # Registration must succeed
        self.assertEqual(response.status_code, 201, response.json())

        # The created user must have status='pending'
        created_user = User.objects.get(email=unique_email)
        self.assertEqual(created_user.status, 'pending')
        self.assertEqual(created_user.role, 'resident')
        self.assertEqual(created_user.project_id, self.project.id)

        # A notification must exist for the juristic user
        notification_exists = Notification.objects.filter(
            user=self.juristic_user,
            type='approval',
        ).exists()
        self.assertTrue(
            notification_exists,
            'No approval notification was created for the juristic user',
        )


@override_settings(TEST_MODE=True)
class InvalidRegistrationRejectedTest(TestCase):
    """
    Property 2: การ validate ข้อมูลลงทะเบียนที่ไม่ถูกต้อง

    For any invalid registration data (bad email, empty required fields),
    the system must reject the request and not create any user.

    **Validates: Requirements 1.3**
    """

    def setUp(self):
        """Create a project for context."""
        self.project = Project.objects.create(
            name='Test Project',
            address='123 Test Street',
        )

    @given(
        bad_email=st.text(min_size=1, max_size=200).filter(
            lambda s: '@' not in s or '.' not in s.split('@')[-1]
        ),
        full_name=st.text(
            alphabet=st.characters(whitelist_categories=('L', 'Zs')),
            min_size=1,
            max_size=100,
        ).filter(lambda s: s.strip() != ''),
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_invalid_email_rejected(self, bad_email, full_name):
        """
        Registration with an invalid email format must be rejected (400)
        and no user should be created.

        **Validates: Requirements 1.3**
        """
        user_count_before = User.objects.count()

        response = self.client.post(
            '/api/auth/register/',
            data={
                'email': bad_email,
                'full_name': full_name,
                'phone': '0812345678',
                'unit_number': 'A101',
                'project_id': str(self.project.id),
            },
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), user_count_before)

    @given(
        email=email_strategy,
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_empty_full_name_rejected(self, email):
        """
        Registration with an empty full_name must be rejected (400)
        and no user should be created.

        **Validates: Requirements 1.3**
        """
        unique_email = f"{uuid.uuid4().hex[:8]}_{email}"
        if len(unique_email) > 255:
            unique_email = unique_email[:255]

        user_count_before = User.objects.count()

        response = self.client.post(
            '/api/auth/register/',
            data={
                'email': unique_email,
                'full_name': '',
                'phone': '0812345678',
                'unit_number': 'A101',
                'project_id': str(self.project.id),
            },
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), user_count_before)

    @given(
        full_name=st.text(
            alphabet=st.characters(whitelist_categories=('L', 'Zs')),
            min_size=1,
            max_size=100,
        ).filter(lambda s: s.strip() != ''),
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_duplicate_email_rejected(self, full_name):
        """
        Registration with an email that already exists must be rejected (400)
        with an appropriate error message, and no new user should be created.

        **Validates: Requirements 1.3**
        """
        existing_email = f"existing_{uuid.uuid4().hex[:8]}@example.com"
        User.objects.create(
            email=existing_email,
            full_name='Existing User',
            role='resident',
            status='pending',
            project=self.project,
        )
        user_count_before = User.objects.count()

        response = self.client.post(
            '/api/auth/register/',
            data={
                'email': existing_email,
                'full_name': full_name,
                'phone': '0812345678',
                'unit_number': 'B202',
                'project_id': str(self.project.id),
            },
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), user_count_before)
        # Verify the error mentions the email issue
        data = response.json()
        self.assertIn('error', data)


@override_settings(TEST_MODE=True)
class LoginReturnsCorrectRoleTest(TestCase):
    """
    Property 3: การ login ส่งกลับบทบาทที่ถูกต้อง

    For any user with status='approved', when calling GET /api/auth/me/
    with valid credentials, the response must contain a role that matches
    the role stored in the database.

    **Validates: Requirements 2.1**
    """

    def setUp(self):
        self.project = Project.objects.create(
            name='Test Project',
            address='123 Test Street',
        )

    @given(
        role=st.sampled_from(['resident', 'juristic', 'developer']),
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_login_returns_correct_role(self, role):
        """
        Property 3: การ login ส่งกลับบทบาทที่ถูกต้อง

        **Validates: Requirements 2.1**
        """
        uid = uuid.uuid4()
        user = User.objects.create(
            email=f'{uid.hex[:12]}@example.com',
            full_name='Test User',
            role=role,
            status='approved',
            supabase_uid=uid,
            project=self.project,
        )

        response = self.client.get(
            '/api/auth/me/',
            HTTP_AUTHORIZATION=f'Bearer {uid}',
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['role'], role)
        self.assertEqual(data['role'], user.role)


@override_settings(TEST_MODE=True)
class UserStatusTransitionTest(TestCase):
    """
    Property 4: การเปลี่ยนสถานะผู้ใช้ (อนุมัติ/ปฏิเสธ/ระงับ)

    For any pending resident user, when a juristic user approves or rejects them,
    the system must:
    1. Update the user's status to 'approved' or 'rejected' accordingly
    2. Create a notification for the affected user

    **Validates: Requirements 3.1, 3.2, 3.4**
    """

    def setUp(self):
        """Create a project, a juristic user (approved), for authentication."""
        self.project = Project.objects.create(
            name='Test Project',
            address='123 Test Street',
        )
        self.juristic_uid = uuid.uuid4()
        self.juristic_user = User.objects.create(
            email='juristic_admin@example.com',
            full_name='Juristic Admin',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_uid,
            project=self.project,
        )

    @given(
        action=st.sampled_from(['approve', 'reject']),
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_status_transition_with_notification(self, action):
        """
        Property 4: การเปลี่ยนสถานะผู้ใช้ (อนุมัติ/ปฏิเสธ/ระงับ)

        **Validates: Requirements 3.1, 3.2, 3.4**
        """
        # Create a fresh pending resident for each example
        resident = User.objects.create(
            email=f'resident_{uuid.uuid4().hex[:12]}@example.com',
            full_name='Pending Resident',
            role='resident',
            status='pending',
            project=self.project,
        )

        notification_count_before = Notification.objects.filter(user=resident).count()

        url = f'/api/users/{resident.id}/{action}/'
        response = self.client.patch(
            url,
            HTTP_AUTHORIZATION=f'Bearer {self.juristic_uid}',
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.json())

        # Reload user from DB
        resident.refresh_from_db()

        expected_status = 'approved' if action == 'approve' else 'rejected'
        self.assertEqual(
            resident.status,
            expected_status,
            f'Expected status={expected_status} after {action}, got {resident.status}',
        )

        # A notification must have been created for the resident
        notification_count_after = Notification.objects.filter(user=resident).count()
        self.assertGreater(
            notification_count_after,
            notification_count_before,
            f'No notification created for resident after {action}',
        )

        # Verify the notification is of type 'approval'
        latest_notification = Notification.objects.filter(
            user=resident, type='approval'
        ).order_by('-created_at').first()
        self.assertIsNotNone(
            latest_notification,
            f'No approval notification found for resident after {action}',
        )


@override_settings(TEST_MODE=True)
class UserListHasCompleteFieldsTest(TestCase):
    """
    Property 5: รายการผู้ใช้มีข้อมูลครบถ้วน

    For any project, when a juristic user fetches the user list via
    GET /api/users/, every record must contain the fields: status, role,
    and unit_number.

    **Validates: Requirements 3.3**
    """

    def setUp(self):
        self.project = Project.objects.create(
            name='Test Project',
            address='123 Test Street',
        )
        self.juristic_uid = uuid.uuid4()
        self.juristic_user = User.objects.create(
            email='juristic_list@example.com',
            full_name='Juristic Manager',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_uid,
            project=self.project,
        )

    @given(
        num_residents=st.integers(min_value=1, max_value=5),
        statuses=st.lists(
            st.sampled_from(['pending', 'approved', 'rejected', 'suspended']),
            min_size=1,
            max_size=5,
        ),
        roles=st.lists(
            st.sampled_from(['resident', 'juristic', 'developer']),
            min_size=1,
            max_size=5,
        ),
        unit_numbers=st.lists(
            st.from_regex(r'[A-Z]?[0-9]{1,4}/[0-9]{1,4}', fullmatch=True),
            min_size=1,
            max_size=5,
        ),
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_user_list_has_complete_fields(
        self, num_residents, statuses, roles, unit_numbers
    ):
        """
        Property 5: รายการผู้ใช้มีข้อมูลครบถ้วน

        **Validates: Requirements 3.3**
        """
        # Create users with various attributes
        for i in range(num_residents):
            User.objects.create(
                email=f'user_{uuid.uuid4().hex[:12]}@example.com',
                full_name=f'User {i}',
                role=roles[i % len(roles)],
                status=statuses[i % len(statuses)],
                unit_number=unit_numbers[i % len(unit_numbers)],
                project=self.project,
            )

        response = self.client.get(
            '/api/users/',
            HTTP_AUTHORIZATION=f'Bearer {self.juristic_uid}',
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0, 'User list should not be empty')

        for record in data:
            self.assertIn('status', record, f'Record missing "status": {record}')
            self.assertIn('role', record, f'Record missing "role": {record}')
            self.assertIn('unit_number', record, f'Record missing "unit_number": {record}')
