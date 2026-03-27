"""
Property-based tests for the parcels app.

Covers:
- Property 7: การบันทึกพัสดุสร้าง notification ให้เจ้าของ
- Property 8: รายการพัสดุของ Resident มีข้อมูลครบถ้วน
- Property 9: การยืนยันรับพัสดุ (Pickup Round Trip)
- Property 17: OCR ที่มี confidence >= 60% ส่งกลับข้อมูลครบ
"""
import json
import uuid
from unittest.mock import patch, MagicMock

from django.test import override_settings
from hypothesis import given, settings as hypothesis_settings
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase

from accounts.models import Project, User
from notifications.models import Notification
from parcels.models import Parcel


# --- Reusable strategies ---

recipient_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'Zs')),
    min_size=1,
    max_size=80,
).filter(lambda s: s.strip() != '')

unit_number_strategy = st.from_regex(r'[A-Z]?[0-9]{1,4}/[0-9]{1,4}', fullmatch=True)

courier_strategy = st.sampled_from([
    'Kerry Express', 'Flash Express', 'Thailand Post',
    'J&T Express', 'DHL', 'Ninja Van', 'Shopee Express',
])

tracking_number_strategy = st.from_regex(r'[A-Z]{2}[0-9]{9}[A-Z]{2}', fullmatch=True)


@override_settings(TEST_MODE=True)
class ParcelCreatesNotificationTest(TestCase):
    """
    Property 7: การบันทึกพัสดุสร้าง notification ให้เจ้าของ

    For any valid parcel creation by a juristic user, when a matching
    resident exists, the system must create a 'parcel' notification
    for that resident.

    **Validates: Requirements 6.1, 9.3**
    """

    def setUp(self):
        self.project = Project.objects.create(
            name='Test Project',
            address='123 Test Street',
        )
        self.juristic_uid = uuid.uuid4()
        self.juristic_user = User.objects.create(
            email='juristic_parcel@example.com',
            full_name='Juristic Parcel Manager',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_uid,
            project=self.project,
        )

    @given(
        recipient_name=recipient_name_strategy,
        unit_number=unit_number_strategy,
        courier=courier_strategy,
        tracking_number=tracking_number_strategy,
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_parcel_creation_creates_notification_for_resident(
        self, recipient_name, unit_number, courier, tracking_number
    ):
        """
        Property 7: การบันทึกพัสดุสร้าง notification ให้เจ้าของ

        **Validates: Requirements 6.1, 9.3**
        """
        # Create a resident matching the unit_number
        resident = User.objects.create(
            email=f'resident_{uuid.uuid4().hex[:12]}@example.com',
            full_name=recipient_name,
            role='resident',
            status='approved',
            unit_number=unit_number,
            project=self.project,
        )

        notif_count_before = Notification.objects.filter(
            user=resident, type='parcel'
        ).count()

        response = self.client.post(
            '/api/parcels/',
            data=json.dumps({
                'recipient_name': recipient_name,
                'unit_number': unit_number,
                'courier': courier,
                'tracking_number': tracking_number,
                'project_id': str(self.project.id),
            }),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {self.juristic_uid}',
        )

        self.assertEqual(response.status_code, 201, response.json())

        # A 'parcel' notification must exist for the resident
        notif_count_after = Notification.objects.filter(
            user=resident, type='parcel'
        ).count()
        self.assertGreater(
            notif_count_after,
            notif_count_before,
            'No parcel notification was created for the resident',
        )

        # Verify notification content
        notification = Notification.objects.filter(
            user=resident, type='parcel'
        ).order_by('-created_at').first()
        self.assertIsNotNone(notification)
        self.assertIn('parcel_id', notification.data)



@override_settings(TEST_MODE=True)
class ParcelListHasCompleteFieldsTest(TestCase):
    """
    Property 8: รายการพัสดุของ Resident มีข้อมูลครบถ้วน

    For any resident, every parcel record returned by GET /api/parcels/
    must have status, arrived_at, image_url fields and belong to that resident.

    **Validates: Requirements 6.2**
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
        num_parcels=st.integers(min_value=1, max_value=5),
        couriers=st.lists(courier_strategy, min_size=1, max_size=5),
        image_urls=st.lists(
            st.from_regex(r'https://storage\.example\.com/parcels/[a-z0-9]{8}\.jpg', fullmatch=True),
            min_size=1,
            max_size=5,
        ),
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_parcel_list_has_complete_fields_for_resident(
        self, num_parcels, couriers, image_urls
    ):
        """
        Property 8: รายการพัสดุของ Resident มีข้อมูลครบถ้วน

        **Validates: Requirements 6.2**
        """
        resident_uid = uuid.uuid4()
        resident = User.objects.create(
            email=f'resident_{uuid.uuid4().hex[:12]}@example.com',
            full_name='Test Resident',
            role='resident',
            status='approved',
            unit_number='A101',
            supabase_uid=resident_uid,
            project=self.project,
        )

        # Create parcels for this resident
        for i in range(num_parcels):
            Parcel.objects.create(
                project=self.project,
                resident=resident,
                registered_by=self.juristic_user,
                recipient_name='Test Resident',
                unit_number='A101',
                courier=couriers[i % len(couriers)],
                tracking_number=f'TH{uuid.uuid4().hex[:9].upper()}TH',
                status='pending',
                image_url=image_urls[i % len(image_urls)],
            )

        response = self.client.get(
            '/api/parcels/',
            HTTP_AUTHORIZATION=f'Bearer {resident_uid}',
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), num_parcels)

        for record in data:
            # Must have required fields
            self.assertIn('status', record, f'Record missing "status": {record}')
            self.assertIn('arrived_at', record, f'Record missing "arrived_at": {record}')
            self.assertIn('image_url', record, f'Record missing "image_url": {record}')

            # Status must be a valid choice
            self.assertIn(record['status'], ['pending', 'picked_up'])

            # arrived_at must not be null
            self.assertIsNotNone(record['arrived_at'])

            # Must belong to this resident
            self.assertEqual(
                record['resident_id'],
                str(resident.id),
                'Parcel does not belong to the requesting resident',
            )


@override_settings(TEST_MODE=True)
class ParcelPickupRoundTripTest(TestCase):
    """
    Property 9: การยืนยันรับพัสดุ (Pickup Round Trip)

    For any pending parcel, after calling PATCH /api/parcels/{id}/pickup/,
    the status must be 'picked_up' and picked_up_at must not be null.

    **Validates: Requirements 6.3**
    """

    def setUp(self):
        self.project = Project.objects.create(
            name='Test Project',
            address='123 Test Street',
        )
        self.juristic_uid = uuid.uuid4()
        self.juristic_user = User.objects.create(
            email='juristic_pickup@example.com',
            full_name='Juristic Pickup Manager',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_uid,
            project=self.project,
        )

    @given(
        recipient_name=recipient_name_strategy,
        unit_number=unit_number_strategy,
        courier=courier_strategy,
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_pickup_sets_status_and_timestamp(
        self, recipient_name, unit_number, courier
    ):
        """
        Property 9: การยืนยันรับพัสดุ (Pickup Round Trip)

        **Validates: Requirements 6.3**
        """
        # Create a pending parcel
        parcel = Parcel.objects.create(
            project=self.project,
            registered_by=self.juristic_user,
            recipient_name=recipient_name,
            unit_number=unit_number,
            courier=courier,
            status='pending',
        )

        self.assertEqual(parcel.status, 'pending')
        self.assertIsNone(parcel.picked_up_at)

        # Confirm pickup
        response = self.client.patch(
            f'/api/parcels/{parcel.id}/pickup/',
            HTTP_AUTHORIZATION=f'Bearer {self.juristic_uid}',
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.json())

        data = response.json()
        self.assertEqual(data['status'], 'picked_up')
        self.assertIsNotNone(data['picked_up_at'])

        # Verify in DB
        parcel.refresh_from_db()
        self.assertEqual(parcel.status, 'picked_up')
        self.assertIsNotNone(parcel.picked_up_at)


@override_settings(TEST_MODE=True)
class OCRHighConfidenceReturnsCompleteDataTest(TestCase):
    """
    Property 17: OCR ที่มี confidence >= 60% ส่งกลับข้อมูลครบ

    For any OCR result where confidence >= 60%, all fields
    (recipient_name, unit_number, courier, tracking_number) must be populated.

    Tests the ocr_service.scan_parcel_image function directly with mocked
    Azure CV and Typhoon responses.

    **Validates: Requirements 9.2**
    """

    @given(
        confidence=st.floats(min_value=0.60, max_value=1.0),
        recipient_name=recipient_name_strategy,
        unit_number=unit_number_strategy,
        courier=courier_strategy,
        tracking_number=tracking_number_strategy,
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_high_confidence_ocr_returns_all_fields(
        self, confidence, recipient_name, unit_number, courier, tracking_number
    ):
        """
        Property 17: OCR ที่มี confidence >= 60% ส่งกลับข้อมูลครบ

        **Validates: Requirements 9.2**
        """
        # Mock Azure CV to return raw text with the given confidence
        raw_text = f"{recipient_name}\n{unit_number}\n{courier}\n{tracking_number}"

        # Mock Typhoon to return structured data parsed from the raw text
        typhoon_result = {
            'recipient_name': recipient_name,
            'unit_number': unit_number,
            'courier': courier,
            'tracking_number': tracking_number,
        }

        with patch(
            'parcels.ocr_service._call_azure_cv',
            return_value=(raw_text, confidence),
        ), patch(
            'parcels.ocr_service._call_typhoon',
            return_value=typhoon_result,
        ):
            from parcels.ocr_service import scan_parcel_image
            result = scan_parcel_image(b'fake-image-data')

        # confidence must be >= 60%
        self.assertGreaterEqual(result['confidence'], 0.60)

        # All fields must be populated (non-empty)
        self.assertTrue(
            result['recipient_name'].strip() != '',
            f'recipient_name is empty: {result}',
        )
        self.assertTrue(
            result['unit_number'].strip() != '',
            f'unit_number is empty: {result}',
        )
        self.assertTrue(
            result['courier'].strip() != '',
            f'courier is empty: {result}',
        )
        self.assertTrue(
            result['tracking_number'].strip() != '',
            f'tracking_number is empty: {result}',
        )

    @given(
        confidence=st.floats(min_value=0.0, max_value=0.59),
    )
    @hypothesis_settings(max_examples=20, deadline=5000)
    def test_low_confidence_ocr_returns_empty_fields(self, confidence):
        """
        Complementary check: OCR with confidence < 60% returns empty fields.

        **Validates: Requirements 9.2**
        """
        with patch(
            'parcels.ocr_service._call_azure_cv',
            return_value=('some text', confidence),
        ):
            from parcels.ocr_service import scan_parcel_image
            result = scan_parcel_image(b'fake-image-data')

        self.assertLess(result['confidence'], 0.60)
        self.assertEqual(result['recipient_name'], '')
        self.assertEqual(result['unit_number'], '')
        self.assertEqual(result['courier'], '')
        self.assertEqual(result['tracking_number'], '')
