from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from facilities.models import Facility, Booking
from facilities.serializers import (
    FacilityStatusSerializer,
    BookingSerializer,
    BookingCreateSerializer,
)
from accounts.permissions import IsAuthenticated, IsApproved


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
