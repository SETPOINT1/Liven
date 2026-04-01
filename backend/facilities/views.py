from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from facilities.models import Facility, Booking
from facilities.serializers import (
    FacilityStatusSerializer,
    BookingSerializer,
    BookingCreateSerializer,
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
            context={'facility_id': facility.id},
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
        # Ensure juristic can only manage their own project's facilities
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
        serializer = BookingSerializer(queryset, many=True)
        return Response(serializer.data)


class BookingCancelView(APIView):
    """Juristic: cancel a booking."""
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def post(self, request, pk):
        """POST /api/manage/bookings/{id}/cancel/ — Cancel a booking."""
        try:
            booking = Booking.objects.select_related('facility').get(pk=pk)
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
        return Response(BookingSerializer(booking).data)
