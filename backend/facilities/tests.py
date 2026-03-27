"""
Property-based tests for the facilities app.

**Validates: Requirements 5.1, 5.2, 5.3**
"""
import uuid
from datetime import timedelta

from django.test import override_settings
from django.utils import timezone
from hypothesis import given, settings as hypothesis_settings
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase
from unittest.mock import patch

from accounts.models import Project, User
from facilities.models import Facility, Booking


# --- Hypothesis strategies ---

# Duration of a booking in minutes (15 min to 4 hours)
duration_minutes_strategy = st.integers(min_value=15, max_value=240)

# Offset in minutes from booking start to "now" — can be before, during, or after
offset_minutes_strategy = st.integers(min_value=-300, max_value=300)


@override_settings(TEST_MODE=True)
class FacilityStatusMatchesBookingsTest(TestCase):
    """
    Property 6: สถานะ Facility ตรงกับข้อมูลการจอง

    For any Facility and for any time, the status must be "occupied"
    if and only if there is a confirmed Booking whose time range overlaps
    with the current time. Otherwise the status must be "available".

    **Validates: Requirements 5.1, 5.2, 5.3**
    """

    def setUp(self):
        """Create a project, juristic user, and facility as fixtures."""
        self.project = Project.objects.create(
            name='Test Project',
            address='123 Test Street',
        )
        self.juristic_uid = uuid.uuid4()
        self.juristic_user = User.objects.create(
            email='juristic_facility@example.com',
            full_name='Juristic Manager',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_uid,
            project=self.project,
        )
        self.facility = Facility.objects.create(
            name='Test Fitness',
            type='fitness',
            project=self.project,
            is_active=True,
        )

    @given(
        duration_minutes=duration_minutes_strategy,
        offset_minutes=offset_minutes_strategy,
    )
    @hypothesis_settings(max_examples=30, deadline=5000)
    def test_facility_status_occupied_when_booking_overlaps(
        self, duration_minutes, offset_minutes,
    ):
        """
        Property 6: สถานะ Facility ตรงกับข้อมูลการจอง

        Create a confirmed booking, then set "now" to either inside or
        outside the booking range. Verify the facility status endpoint
        returns the correct current_status.

        **Validates: Requirements 5.1, 5.2, 5.3**
        """
        # Use a fixed base time to avoid timezone edge cases
        base_time = timezone.now().replace(microsecond=0)

        # Booking window
        booking_start = base_time
        booking_end = base_time + timedelta(minutes=duration_minutes)

        # Create a confirmed booking
        booking = Booking.objects.create(
            facility=self.facility,
            user=self.juristic_user,
            start_time=booking_start,
            end_time=booking_end,
            status='confirmed',
        )

        # "now" is offset from booking_start
        fake_now = booking_start + timedelta(minutes=offset_minutes)

        # Determine expected status: overlap means
        # start_time <= now AND end_time >= now
        is_during_booking = (booking_start <= fake_now <= booking_end)
        expected_status = 'occupied' if is_during_booking else 'available'

        with patch('django.utils.timezone.now', return_value=fake_now):
            response = self.client.get(
                f'/api/facilities/{self.facility.id}/status/',
                HTTP_AUTHORIZATION=f'Bearer {self.juristic_uid}',
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(
            data['current_status'],
            expected_status,
            f'Expected {expected_status} when booking=[{booking_start}, {booking_end}] '
            f'and now={fake_now}',
        )

        # Clean up booking for next Hypothesis example
        booking.delete()
