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

# Strategy for generating hour offsets for booking start times (0 to 72 hours ahead)
booking_hour_offset_strategy = st.integers(min_value=1, max_value=72)


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


@override_settings(TEST_MODE=True)
class SlotDurationValidationTest(TestCase):
    """
    Unit tests for BookingCreateSerializer slot duration validation.
    Validates that booking duration must match the facility type's expected slot duration:
    - meeting_room → 60 minutes
    - theatre → 120 minutes
    - other types → 60 minutes (default)
    """

    def setUp(self):
        self.project = Project.objects.create(
            name='Test Project Duration',
            address='456 Test Ave',
        )
        self.user = User.objects.create(
            email='resident_duration@example.com',
            full_name='Resident Tester',
            role='resident',
            status='approved',
            supabase_uid=uuid.uuid4(),
            project=self.project,
        )

    def _make_facility(self, facility_type):
        return Facility.objects.create(
            name=f'Test {facility_type}',
            type=facility_type,
            project=self.project,
            requires_booking=True,
            is_active=True,
        )

    def _booking_data(self, duration_minutes):
        start = timezone.now().replace(microsecond=0) + timedelta(hours=1)
        end = start + timedelta(minutes=duration_minutes)
        return {'start_time': start, 'end_time': end}

    # --- meeting_room: expects 60 minutes ---

    def test_meeting_room_60min_valid(self):
        facility = self._make_facility('meeting_room')
        from facilities.serializers import BookingCreateSerializer
        ser = BookingCreateSerializer(
            data=self._booking_data(60),
            context={'facility': facility, 'facility_id': facility.id},
        )
        self.assertTrue(ser.is_valid(), ser.errors)

    def test_meeting_room_30min_invalid(self):
        facility = self._make_facility('meeting_room')
        from facilities.serializers import BookingCreateSerializer
        ser = BookingCreateSerializer(
            data=self._booking_data(30),
            context={'facility': facility, 'facility_id': facility.id},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn('non_field_errors', ser.errors)

    def test_meeting_room_120min_invalid(self):
        facility = self._make_facility('meeting_room')
        from facilities.serializers import BookingCreateSerializer
        ser = BookingCreateSerializer(
            data=self._booking_data(120),
            context={'facility': facility, 'facility_id': facility.id},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn('non_field_errors', ser.errors)

    # --- theatre: expects 120 minutes ---

    def test_theatre_120min_valid(self):
        facility = self._make_facility('theatre')
        from facilities.serializers import BookingCreateSerializer
        ser = BookingCreateSerializer(
            data=self._booking_data(120),
            context={'facility': facility, 'facility_id': facility.id},
        )
        self.assertTrue(ser.is_valid(), ser.errors)

    def test_theatre_60min_invalid(self):
        facility = self._make_facility('theatre')
        from facilities.serializers import BookingCreateSerializer
        ser = BookingCreateSerializer(
            data=self._booking_data(60),
            context={'facility': facility, 'facility_id': facility.id},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn('non_field_errors', ser.errors)

    # --- default type (e.g. fitness): expects 60 minutes ---

    def test_fitness_60min_valid(self):
        facility = self._make_facility('fitness')
        from facilities.serializers import BookingCreateSerializer
        ser = BookingCreateSerializer(
            data=self._booking_data(60),
            context={'facility': facility, 'facility_id': facility.id},
        )
        self.assertTrue(ser.is_valid(), ser.errors)

    def test_fitness_90min_invalid(self):
        facility = self._make_facility('fitness')
        from facilities.serializers import BookingCreateSerializer
        ser = BookingCreateSerializer(
            data=self._booking_data(90),
            context={'facility': facility, 'facility_id': facility.id},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn('non_field_errors', ser.errors)

    # --- end_time before start_time still rejected ---

    def test_end_before_start_rejected(self):
        facility = self._make_facility('meeting_room')
        start = timezone.now() + timedelta(hours=2)
        end = start - timedelta(minutes=30)
        from facilities.serializers import BookingCreateSerializer
        ser = BookingCreateSerializer(
            data={'start_time': start, 'end_time': end},
            context={'facility': facility, 'facility_id': facility.id},
        )
        self.assertFalse(ser.is_valid())
        self.assertIn('end_time', ser.errors)


@override_settings(TEST_MODE=True)
class NoBookingOverlapInvariantTest(TestCase):
    """
    Property 1: No Booking Overlap Invariant

    For any Facility and any 2 Bookings with status=confirmed on the same
    Facility, their time ranges (start_time, end_time) must not overlap.
    i.e., booking_a.end_time <= booking_b.start_time OR
          booking_b.end_time <= booking_a.start_time

    **Validates: Requirements 1.2**

    Feature: facility-management, Property 1
    """

    def setUp(self):
        """Create a project, resident user, and bookable meeting_room facility."""
        self.project = Project.objects.create(
            name='Overlap Test Project',
            address='789 Overlap Street',
        )
        self.resident_uid = uuid.uuid4()
        self.resident_user = User.objects.create(
            email='resident_overlap@example.com',
            full_name='Resident Overlap Tester',
            role='resident',
            status='approved',
            supabase_uid=self.resident_uid,
            project=self.project,
        )
        self.facility = Facility.objects.create(
            name='Test Meeting Room',
            type='meeting_room',
            project=self.project,
            requires_booking=True,
            is_active=True,
        )

    @given(
        offset_a=booking_hour_offset_strategy,
        offset_b=booking_hour_offset_strategy,
    )
    @hypothesis_settings(max_examples=100, deadline=5000)
    def test_no_booking_overlap_invariant(self, offset_a, offset_b):
        """
        Generate 2 random 60-min booking time ranges, attempt to create both
        via the API, and assert that if both succeed (201) their time ranges
        do not overlap.

        **Validates: Requirements 1.2**
        """
        now = timezone.now().replace(microsecond=0, second=0, minute=0)

        # Booking A: starts offset_a hours from now, duration 60 min (meeting_room)
        start_a = now + timedelta(hours=offset_a)
        end_a = start_a + timedelta(minutes=60)

        # Booking B: starts offset_b hours from now, duration 60 min (meeting_room)
        start_b = now + timedelta(hours=offset_b)
        end_b = start_b + timedelta(minutes=60)

        auth_header = f'Bearer {self.resident_uid}'
        book_url = f'/api/facilities/{self.facility.id}/book/'

        # Create booking A
        response_a = self.client.post(
            book_url,
            data={
                'start_time': start_a.isoformat(),
                'end_time': end_a.isoformat(),
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=auth_header,
        )

        # Create booking B
        response_b = self.client.post(
            book_url,
            data={
                'start_time': start_b.isoformat(),
                'end_time': end_b.isoformat(),
            },
            content_type='application/json',
            HTTP_AUTHORIZATION=auth_header,
        )

        # If both bookings were created successfully, they must not overlap
        if response_a.status_code == 201 and response_b.status_code == 201:
            # No overlap means: end_a <= start_b OR end_b <= start_a
            no_overlap = (end_a <= start_b) or (end_b <= start_a)
            self.assertTrue(
                no_overlap,
                f'Two confirmed bookings overlap! '
                f'Booking A: [{start_a}, {end_a}], '
                f'Booking B: [{start_b}, {end_b}]',
            )

        # Clean up bookings for next Hypothesis example
        Booking.objects.filter(facility=self.facility).delete()


@override_settings(TEST_MODE=True)
class SlotBoundaryInvariantTest(TestCase):
    """
    Property 2: Slot Boundary Invariant

    For any Facility with operating_hours and any date, all generated Slots
    must have start_time >= opening time AND end_time <= closing time.

    **Validates: Requirements 1.2**

    Feature: facility-management, Property 2
    """

    def setUp(self):
        """Create a project, approved user, and bookable facility."""
        self.project = Project.objects.create(
            name='Slot Boundary Test Project',
            address='100 Boundary Ave',
        )
        self.user_uid = uuid.uuid4()
        self.user = User.objects.create(
            email='resident_boundary@example.com',
            full_name='Resident Boundary Tester',
            role='resident',
            status='approved',
            supabase_uid=self.user_uid,
            project=self.project,
        )

    @given(
        open_hour=st.integers(min_value=0, max_value=20),
        close_hour_offset=st.integers(min_value=2, max_value=3),
    )
    @hypothesis_settings(max_examples=100, deadline=5000)
    def test_all_slots_within_operating_hours(self, open_hour, close_hour_offset):
        """
        Generate a Facility with random operating_hours (open_hour from 0-20,
        close_hour from open_hour+2 to 23), request slots for today, and
        verify every slot's start_time >= opening time and end_time <= closing time.

        **Validates: Requirements 1.2**
        """
        close_hour = min(open_hour + close_hour_offset, 23)
        # Ensure at least 2 hours gap so at least 1 slot can be generated
        if close_hour - open_hour < 1:
            return

        operating_hours = f'{open_hour:02d}:00 - {close_hour:02d}:00'

        facility = Facility.objects.create(
            name=f'Boundary Facility {open_hour}-{close_hour}',
            type='meeting_room',
            project=self.project,
            requires_booking=True,
            is_active=True,
            operating_hours=operating_hours,
        )

        today_str = timezone.now().strftime('%Y-%m-%d')
        target_date = timezone.now().date()

        response = self.client.get(
            f'/api/facilities/{facility.id}/slots/?date={today_str}',
            HTTP_AUTHORIZATION=f'Bearer {self.user_uid}',
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        slots = data.get('slots', [])

        from datetime import datetime

        day_open = datetime.combine(target_date, datetime.min.time().replace(hour=open_hour))
        day_close = datetime.combine(target_date, datetime.min.time().replace(hour=close_hour))

        for slot in slots:
            slot_start = datetime.fromisoformat(slot['start_time'])
            slot_end = datetime.fromisoformat(slot['end_time'])

            self.assertGreaterEqual(
                slot_start,
                day_open,
                f'Slot start {slot_start} is before opening time {day_open} '
                f'(operating_hours={operating_hours})',
            )
            self.assertLessEqual(
                slot_end,
                day_close,
                f'Slot end {slot_end} is after closing time {day_close} '
                f'(operating_hours={operating_hours})',
            )

        # Clean up
        facility.delete()


@override_settings(TEST_MODE=True)
class SlotDurationInvariantTest(TestCase):
    """
    Property 3: Slot Duration Invariant

    For any Facility with requires_booking=true and any date, all generated
    Slots must have duration (end_time - start_time) equal to the Slot_Duration
    for that facility type:
    - meeting_room → 60 minutes
    - theatre → 120 minutes
    - other → 60 minutes (default)

    **Validates: Requirements 1.2**

    Feature: facility-management, Property 3
    """

    EXPECTED_DURATIONS = {
        'meeting_room': 60,
        'theatre': 120,
    }
    DEFAULT_DURATION = 60

    def setUp(self):
        """Create a project and approved user as fixtures."""
        self.project = Project.objects.create(
            name='Slot Duration Test Project',
            address='200 Duration Blvd',
        )
        self.user_uid = uuid.uuid4()
        self.user = User.objects.create(
            email='resident_duration_prop@example.com',
            full_name='Resident Duration Prop Tester',
            role='resident',
            status='approved',
            supabase_uid=self.user_uid,
            project=self.project,
        )

    @given(
        facility_type=st.sampled_from(['meeting_room', 'theatre']),
    )
    @hypothesis_settings(max_examples=100, deadline=5000)
    def test_slot_duration_matches_facility_type(self, facility_type):
        """
        Generate a Facility with a random bookable type, request slots for
        today, and verify every slot's duration equals the expected
        Slot_Duration for that facility type.

        **Validates: Requirements 1.2**
        """
        expected_minutes = self.EXPECTED_DURATIONS.get(
            facility_type, self.DEFAULT_DURATION
        )

        facility = Facility.objects.create(
            name=f'Duration Test {facility_type}',
            type=facility_type,
            project=self.project,
            requires_booking=True,
            is_active=True,
            operating_hours='06:00 - 22:00',
        )

        today_str = timezone.now().strftime('%Y-%m-%d')

        response = self.client.get(
            f'/api/facilities/{facility.id}/slots/?date={today_str}',
            HTTP_AUTHORIZATION=f'Bearer {self.user_uid}',
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        slots = data.get('slots', [])

        # There should be at least 1 slot for a 06:00-22:00 window
        self.assertGreater(
            len(slots), 0,
            f'Expected at least 1 slot for {facility_type} with 06:00-22:00 hours',
        )

        from datetime import datetime as dt

        for slot in slots:
            slot_start = dt.fromisoformat(slot['start_time'])
            slot_end = dt.fromisoformat(slot['end_time'])
            actual_minutes = (slot_end - slot_start).total_seconds() / 60

            self.assertEqual(
                actual_minutes,
                expected_minutes,
                f'Slot duration mismatch for {facility_type}: '
                f'expected {expected_minutes} min, got {actual_minutes} min '
                f'(slot: {slot_start} - {slot_end})',
            )

        # Clean up
        facility.delete()


@override_settings(TEST_MODE=True)
class AdvanceBookingLimitTest(TestCase):
    """
    Property 4: Advance Booking Limit

    For any requested date, if the date is before today or more than 3 days
    ahead (today + 2 days), the Backend must reject the request with 400.
    If the date is within the limit (today, tomorrow, day after tomorrow),
    it must return 200 with slots.

    **Validates: Requirements 1.2**

    Feature: facility-management, Property 4
    """

    def setUp(self):
        """Create a project, approved user, and bookable facility."""
        self.project = Project.objects.create(
            name='Advance Limit Test Project',
            address='300 Advance Ave',
        )
        self.user_uid = uuid.uuid4()
        self.user = User.objects.create(
            email='resident_advance@example.com',
            full_name='Resident Advance Tester',
            role='resident',
            status='approved',
            supabase_uid=self.user_uid,
            project=self.project,
        )
        self.facility = Facility.objects.create(
            name='Advance Limit Meeting Room',
            type='meeting_room',
            project=self.project,
            requires_booking=True,
            is_active=True,
            operating_hours='06:00 - 22:00',
        )

    @given(day_offset=st.integers(min_value=-30, max_value=30))
    @hypothesis_settings(max_examples=100, deadline=5000)
    def test_advance_booking_limit(self, day_offset):
        """
        Generate a random day offset from today (-30 to +30). Request slots
        for that date and verify:
        - Dates within limit (offset 0, 1, 2) → 200 with slots
        - Dates outside limit (offset < 0 or offset > 2) → 400 error

        **Validates: Requirements 1.2**
        """
        today = timezone.now().date()
        target_date = today + timedelta(days=day_offset)
        date_str = target_date.strftime('%Y-%m-%d')

        response = self.client.get(
            f'/api/facilities/{self.facility.id}/slots/?date={date_str}',
            HTTP_AUTHORIZATION=f'Bearer {self.user_uid}',
        )

        within_limit = 0 <= day_offset <= 2

        if within_limit:
            self.assertEqual(
                response.status_code,
                200,
                f'Expected 200 for date {date_str} (offset={day_offset}), '
                f'got {response.status_code}: {response.json()}',
            )
            data = response.json()
            self.assertIn('slots', data)
        else:
            self.assertEqual(
                response.status_code,
                400,
                f'Expected 400 for date {date_str} (offset={day_offset}), '
                f'got {response.status_code}: {response.json()}',
            )


# Strategy for number of bookings to create (0 to 5)
num_bookings_strategy = st.integers(min_value=0, max_value=5)


@override_settings(TEST_MODE=True)
class SlotCountInvariantTest(TestCase):
    """
    Property 5: Slot Count Invariant

    For any Facility with requires_booking=true and any date, the number of
    slots where is_available=true plus the number of slots where
    is_available=false must equal the total number of slots returned.

    **Validates: Requirements 1.2**

    Feature: facility-management, Property 5
    """

    def setUp(self):
        """Create a project, approved user, and bookable facility."""
        self.project = Project.objects.create(
            name='Slot Count Test Project',
            address='400 Count Blvd',
        )
        self.user_uid = uuid.uuid4()
        self.user = User.objects.create(
            email='resident_slotcount@example.com',
            full_name='Resident Slot Count Tester',
            role='resident',
            status='approved',
            supabase_uid=self.user_uid,
            project=self.project,
        )
        self.facility = Facility.objects.create(
            name='Slot Count Meeting Room',
            type='meeting_room',
            project=self.project,
            requires_booking=True,
            is_active=True,
            operating_hours='06:00 - 22:00',
        )

    @given(num_bookings=num_bookings_strategy)
    @hypothesis_settings(max_examples=100, deadline=5000)
    def test_slot_count_invariant(self, num_bookings):
        """
        Generate a random number of bookings (0-5) on the facility for today,
        then request slots and verify:
        count(is_available=true) + count(is_available=false) == len(slots)

        **Validates: Requirements 1.2**
        """
        today = timezone.now().date()
        today_str = today.strftime('%Y-%m-%d')

        # Create random confirmed bookings for distinct slot hours
        # Operating hours 06:00-22:00 with 60-min slots gives hours 6..21
        available_hours = list(range(6, 22))
        booking_hours = available_hours[:num_bookings]

        created_bookings = []
        for hour in booking_hours:
            from datetime import datetime as dt
            start = dt.combine(today, dt.min.time().replace(hour=hour))
            end = start + timedelta(minutes=60)
            booking = Booking.objects.create(
                facility=self.facility,
                user=self.user,
                start_time=start,
                end_time=end,
                status='confirmed',
            )
            created_bookings.append(booking)

        # Request slots
        response = self.client.get(
            f'/api/facilities/{self.facility.id}/slots/?date={today_str}',
            HTTP_AUTHORIZATION=f'Bearer {self.user_uid}',
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        slots = data.get('slots', [])

        # Count available and unavailable
        available_count = sum(1 for s in slots if s['is_available'] is True)
        unavailable_count = sum(1 for s in slots if s['is_available'] is False)
        total_slots = len(slots)

        self.assertEqual(
            available_count + unavailable_count,
            total_slots,
            f'Slot count invariant violated: '
            f'available({available_count}) + unavailable({unavailable_count}) '
            f'!= total({total_slots}) with {num_bookings} bookings',
        )

        # Also verify every slot has the is_available field as a boolean
        for slot in slots:
            self.assertIn('is_available', slot)
            self.assertIsInstance(slot['is_available'], bool)

        # Clean up bookings for next Hypothesis example
        Booking.objects.filter(facility=self.facility).delete()


# Strategy for booking status in cancellation tests
booking_status_strategy = st.sampled_from(['confirmed', 'cancelled'])

# Strategy for time offset in hours: past (-48 to -1) or future (+1 to +48)
time_offset_strategy = st.one_of(
    st.integers(min_value=-48, max_value=-1),
    st.integers(min_value=1, max_value=48),
)


@override_settings(TEST_MODE=True)
class ResidentBookingCancellationTest(TestCase):
    """
    Property 7: Resident Booking Cancellation

    For any Booking with status=confirmed and start_time in the future,
    when the owning Resident cancels it, the status must change to cancelled.
    For any Booking with start_time in the past OR status=cancelled,
    cancellation must be rejected.

    **Validates: Requirements 1.2**

    Feature: facility-management, Property 7
    """

    def setUp(self):
        """Create a project, resident user, and bookable facility."""
        self.project = Project.objects.create(
            name='Cancel Test Project',
            address='500 Cancel Ave',
        )
        self.resident_uid = uuid.uuid4()
        self.resident_user = User.objects.create(
            email='resident_cancel@example.com',
            full_name='Resident Cancel Tester',
            role='resident',
            status='approved',
            supabase_uid=self.resident_uid,
            project=self.project,
        )
        self.facility = Facility.objects.create(
            name='Cancel Test Meeting Room',
            type='meeting_room',
            project=self.project,
            requires_booking=True,
            is_active=True,
        )

    @given(
        booking_status=booking_status_strategy,
        hour_offset=time_offset_strategy,
    )
    @hypothesis_settings(max_examples=100, deadline=5000)
    def test_resident_booking_cancellation(self, booking_status, hour_offset):
        """
        Generate a Booking with a random status (confirmed/cancelled) and a
        random start_time (past or future). Attempt to cancel it via the
        ResidentBookingCancelView API and verify:
        - confirmed + future → cancel succeeds (200), status becomes cancelled
        - confirmed + past → cancel rejected (400, PAST_BOOKING)
        - cancelled + any time → cancel rejected (400, ALREADY_CANCELLED)

        **Validates: Requirements 1.2**
        """
        now = timezone.now().replace(microsecond=0)
        booking_start = now + timedelta(hours=hour_offset)
        booking_end = booking_start + timedelta(minutes=60)

        booking = Booking.objects.create(
            facility=self.facility,
            user=self.resident_user,
            start_time=booking_start,
            end_time=booking_end,
            status=booking_status,
        )

        cancel_url = f'/api/bookings/{booking.id}/cancel/'
        auth_header = f'Bearer {self.resident_uid}'

        response = self.client.post(
            cancel_url,
            content_type='application/json',
            HTTP_AUTHORIZATION=auth_header,
        )

        is_future = hour_offset > 0

        if booking_status == 'cancelled':
            # Already cancelled → rejected regardless of time
            self.assertEqual(
                response.status_code,
                400,
                f'Expected 400 for already cancelled booking, '
                f'got {response.status_code}',
            )
            data = response.json()
            self.assertEqual(data['error']['code'], 'ALREADY_CANCELLED')

        elif booking_status == 'confirmed' and not is_future:
            # Confirmed but in the past → rejected
            self.assertEqual(
                response.status_code,
                400,
                f'Expected 400 for past confirmed booking (offset={hour_offset}h), '
                f'got {response.status_code}',
            )
            data = response.json()
            self.assertEqual(data['error']['code'], 'PAST_BOOKING')

        else:
            # Confirmed + future → cancel succeeds
            self.assertEqual(
                response.status_code,
                200,
                f'Expected 200 for future confirmed booking (offset={hour_offset}h), '
                f'got {response.status_code}',
            )
            data = response.json()
            self.assertEqual(data['status'], 'cancelled')

            # Verify in DB
            booking.refresh_from_db()
            self.assertEqual(booking.status, 'cancelled')

        # Clean up for next Hypothesis example
        booking.delete()


# Strategy for management operations on cross-project resources
management_operation_strategy = st.sampled_from([
    'put_facility',
    'delete_facility',
    'cancel_booking',
])


@override_settings(TEST_MODE=True)
class ProjectIsolationTest(TestCase):
    """
    Property 8: Project Isolation

    For any Juristic_Person and any Facility or Booking that does NOT belong
    to the same project as the Juristic_Person, management operations (edit,
    delete, cancel) must be rejected with HTTP 403.

    **Validates: Requirements 1.2**

    Feature: facility-management, Property 8
    """

    def setUp(self):
        """Create 2 projects with juristic users, facilities and bookings in project_b."""
        # Project A
        self.project_a = Project.objects.create(
            name='Project A',
            address='100 Alpha Street',
        )
        self.juristic_a_uid = uuid.uuid4()
        self.juristic_a = User.objects.create(
            email='juristic_a_isolation@example.com',
            full_name='Juristic A',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_a_uid,
            project=self.project_a,
        )

        # Project B
        self.project_b = Project.objects.create(
            name='Project B',
            address='200 Beta Street',
        )
        self.juristic_b_uid = uuid.uuid4()
        self.juristic_b = User.objects.create(
            email='juristic_b_isolation@example.com',
            full_name='Juristic B',
            role='juristic',
            status='approved',
            supabase_uid=self.juristic_b_uid,
            project=self.project_b,
        )

        # Facility in Project B
        self.facility_b = Facility.objects.create(
            name='Project B Meeting Room',
            type='meeting_room',
            project=self.project_b,
            requires_booking=True,
            is_active=True,
        )

        # Resident in Project B (to own the booking)
        self.resident_b_uid = uuid.uuid4()
        self.resident_b = User.objects.create(
            email='resident_b_isolation@example.com',
            full_name='Resident B',
            role='resident',
            status='approved',
            supabase_uid=self.resident_b_uid,
            project=self.project_b,
        )

        # Booking in Project B
        now = timezone.now().replace(microsecond=0)
        self.booking_b = Booking.objects.create(
            facility=self.facility_b,
            user=self.resident_b,
            start_time=now + timedelta(hours=24),
            end_time=now + timedelta(hours=25),
            status='confirmed',
        )

    @given(operation=management_operation_strategy)
    @hypothesis_settings(max_examples=100, deadline=5000)
    def test_cross_project_management_rejected(self, operation):
        """
        Juristic from Project A attempts to manage resources from Project B.
        All operations must be rejected with HTTP 403.

        **Validates: Requirements 1.2**
        """
        auth_header = f'Bearer {self.juristic_a_uid}'

        if operation == 'put_facility':
            response = self.client.put(
                f'/api/manage/facilities/{self.facility_b.id}/',
                data={'name': 'Hacked Facility'},
                content_type='application/json',
                HTTP_AUTHORIZATION=auth_header,
            )
        elif operation == 'delete_facility':
            response = self.client.delete(
                f'/api/manage/facilities/{self.facility_b.id}/',
                HTTP_AUTHORIZATION=auth_header,
            )
        elif operation == 'cancel_booking':
            response = self.client.post(
                f'/api/manage/bookings/{self.booking_b.id}/cancel/',
                content_type='application/json',
                HTTP_AUTHORIZATION=auth_header,
            )
        else:
            self.fail(f'Unknown operation: {operation}')

        self.assertEqual(
            response.status_code,
            403,
            f'Expected 403 for cross-project {operation} by Juristic A on '
            f'Project B resource, got {response.status_code}: {response.content}',
        )
