from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta
from facilities.models import Facility, Booking
from facilities.serializers import (
    FacilityStatusSerializer,
    BookingSerializer,
    BookingCreateSerializer,
    BookingManageSerializer,
    FacilityManageSerializer,
)
from accounts.permissions import IsAuthenticated, IsApproved, IsJuristic


class FacilityListView(APIView):
    """GET /api/facilities/ — List facilities for user's project with current status."""
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        user = request.user_obj
        queryset = Facility.objects.filter(is_active=True)
        if user.project_id:
            queryset = queryset.filter(project_id=user.project_id)
        queryset = queryset.order_by('name')
        serializer = FacilityStatusSerializer(queryset, many=True)
        return Response(serializer.data)


class FacilityStatusView(APIView):
    """GET /api/facilities/{id}/status/ — Get current status of a specific facility."""
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request, pk):
        try:
            facility = Facility.objects.get(pk=pk)
        except Facility.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบสิ่งอำนวยความสะดวก'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = FacilityStatusSerializer(facility)
        return Response(serializer.data)


class BookFacilityView(APIView):
    """POST /api/facilities/{id}/book/ — Create a booking for a facility."""
    permission_classes = [IsAuthenticated, IsApproved]

    def post(self, request, pk):
        try:
            facility = Facility.objects.get(pk=pk)
        except Facility.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบสิ่งอำนวยความสะดวก'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not facility.requires_booking:
            return Response(
                {'error': {'code': 'BOOKING_NOT_REQUIRED', 'message': 'สิ่งอำนวยความสะดวกนี้ไม่ต้องจอง'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = BookingCreateSerializer(
            data=request.data,
            context={'facility_id': facility.id, 'facility': facility},
        )
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking = Booking.objects.create(
            facility=facility,
            user=request.user_obj,
            start_time=serializer.validated_data['start_time'],
            end_time=serializer.validated_data['end_time'],
            status='confirmed',
        )
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class BookingListView(APIView):
    """GET /api/bookings/ — List current user's bookings."""
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        queryset = Booking.objects.filter(
            user=request.user_obj,
        ).order_by('-start_time')
        serializer = BookingSerializer(queryset, many=True)
        return Response(serializer.data)


class ResidentBookingCancelView(APIView):
    """POST /api/bookings/{id}/cancel/ — Resident cancels their own booking."""
    permission_classes = [IsAuthenticated, IsApproved]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบการจอง'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.user_id != request.user_obj.id:
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'ไม่มีสิทธิ์ยกเลิกการจองนี้'}},
                status=status.HTTP_403_FORBIDDEN,
            )

        if booking.status == 'cancelled':
            return Response(
                {'error': {'code': 'ALREADY_CANCELLED', 'message': 'การจองนี้ถูกยกเลิกแล้ว'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if booking.start_time <= timezone.now():
            return Response(
                {'error': {'code': 'PAST_BOOKING', 'message': 'ไม่สามารถยกเลิกการจองที่ผ่านมาแล้วได้'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = 'cancelled'
        booking.save()
        return Response(BookingSerializer(booking).data)


class FacilitySlotsView(APIView):
    """GET /api/facilities/{id}/slots/?date=YYYY-MM-DD — Get available time slots."""
    permission_classes = [IsAuthenticated, IsApproved]

    MAX_ADVANCE_DAYS = 3

    SLOT_DURATIONS = {
        'meeting_room': 60,
        'theatre': 120,
    }
    DEFAULT_SLOT_DURATION = 60

    def get(self, request, pk):
        try:
            facility = Facility.objects.get(pk=pk)
        except Facility.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบสิ่งอำนวยความสะดวก'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not facility.requires_booking:
            return Response(
                {'error': {'code': 'BOOKING_NOT_REQUIRED', 'message': 'สิ่งอำนวยความสะดวกนี้ไม่ต้องจอง'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        date_str = request.query_params.get('date')
        if not date_str:
            date_str = timezone.now().strftime('%Y-%m-%d')

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': {'code': 'INVALID_DATE', 'message': 'รูปแบบวันที่ไม่ถูกต้อง ใช้ YYYY-MM-DD'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        today = timezone.now().date()
        max_date = today + timedelta(days=self.MAX_ADVANCE_DAYS - 1)
        if target_date < today:
            return Response(
                {'error': {'code': 'PAST_DATE', 'message': 'ไม่สามารถจองวันที่ผ่านมาแล้วได้'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target_date > max_date:
            return Response(
                {'error': {'code': 'ADVANCE_LIMIT', 'message': 'จองล่วงหน้าได้ไม่เกิน 3 วัน'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse operating hours (e.g. "09:00 - 22:00")
        open_hour, close_hour = 6, 22
        if facility.operating_hours:
            try:
                parts = facility.operating_hours.split('-')
                open_hour = int(parts[0].strip().split(':')[0])
                close_hour = int(parts[1].strip().split(':')[0])
            except (ValueError, IndexError):
                pass

        slot_duration = self.SLOT_DURATIONS.get(facility.type, self.DEFAULT_SLOT_DURATION)

        # Generate slots
        slots = []
        current = datetime.combine(target_date, datetime.min.time().replace(hour=open_hour))
        end_of_day = datetime.combine(target_date, datetime.min.time().replace(hour=close_hour))

        while current + timedelta(minutes=slot_duration) <= end_of_day:
            slot_end = current + timedelta(minutes=slot_duration)
            slots.append({
                'start_time': current.isoformat(),
                'end_time': slot_end.isoformat(),
            })
            current = slot_end

        # Check which slots are booked
        bookings = Booking.objects.filter(
            facility_id=facility.id,
            status='confirmed',
            start_time__date=target_date,
        )

        for slot in slots:
            slot_start = datetime.fromisoformat(slot['start_time'])
            slot_end = datetime.fromisoformat(slot['end_time'])
            is_booked = bookings.filter(
                start_time__lt=slot_end,
                end_time__gt=slot_start,
            ).exists()
            slot['is_available'] = not is_booked

        return Response({
            'facility_id': str(facility.id),
            'date': date_str,
            'slot_duration_minutes': slot_duration,
            'slots': slots,
        })


class FacilityManageView(APIView):
    """Juristic: manage facilities for their project."""
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def get(self, request):
        """GET /api/manage/facilities/ — List all facilities (including inactive)."""
        user = request.user_obj
        queryset = Facility.objects.all()
        if user.project_id:
            queryset = queryset.filter(project_id=user.project_id)
        queryset = queryset.order_by('name')
        serializer = FacilityStatusSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        """POST /api/manage/facilities/ — Create a new facility."""
        serializer = FacilityManageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        facility = serializer.save(project=request.user_obj.project)
        return Response(FacilityStatusSerializer(facility).data, status=status.HTTP_201_CREATED)


class FacilityManageDetailView(APIView):
    """Juristic: update/delete a specific facility."""
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def put(self, request, pk):
        """PUT /api/manage/facilities/{id}/ — Update a facility."""
        try:
            facility = Facility.objects.get(pk=pk)
        except Facility.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบสิ่งอำนวยความสะดวก'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.user_obj.project_id and facility.project_id != request.user_obj.project_id:
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'ไม่มีสิทธิ์จัดการสิ่งอำนวยความสะดวกนี้'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = FacilityManageSerializer(facility, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save()
        return Response(FacilityStatusSerializer(facility).data)

    def delete(self, request, pk):
        """DELETE /api/manage/facilities/{id}/ — Delete a facility."""
        try:
            facility = Facility.objects.get(pk=pk)
        except Facility.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบสิ่งอำนวยความสะดวก'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.user_obj.project_id and facility.project_id != request.user_obj.project_id:
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'ไม่มีสิทธิ์จัดการสิ่งอำนวยความสะดวกนี้'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        facility.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BookingManageView(APIView):
    """Juristic: view all bookings for their project's facilities."""
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def get(self, request):
        """GET /api/manage/bookings/ — List all bookings for project facilities."""
        user = request.user_obj
        queryset = Booking.objects.select_related('facility', 'user').all()
        if user.project_id:
            queryset = queryset.filter(facility__project_id=user.project_id)
        queryset = queryset.order_by('-start_time')
        serializer = BookingManageSerializer(queryset, many=True)
        return Response(serializer.data)


class BookingCancelView(APIView):
    """Juristic: cancel a booking."""
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def post(self, request, pk):
        """POST /api/manage/bookings/{id}/cancel/ — Cancel a booking."""
        try:
            booking = Booking.objects.select_related('facility', 'user').get(pk=pk)
        except Booking.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบการจอง'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.user_obj.project_id and booking.facility.project_id != request.user_obj.project_id:
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'ไม่มีสิทธิ์จัดการการจองนี้'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        booking.status = 'cancelled'
        booking.save()
        return Response(BookingManageSerializer(booking).data)
