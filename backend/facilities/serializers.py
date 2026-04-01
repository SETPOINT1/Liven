from django.utils import timezone
from rest_framework import serializers
from facilities.models import Facility, Booking


class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = [
            'id', 'project_id', 'name', 'type', 'description',
            'image_url', 'operating_hours', 'requires_booking', 'is_active', 'created_at',
        ]
        read_only_fields = fields


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = [
            'id', 'facility_id', 'user_id', 'start_time',
            'end_time', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'user_id', 'status', 'created_at']

    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError(
                {'end_time': 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น'}
            )

        # Check for overlapping confirmed bookings on the same facility
        facility_id = data.get('facility_id') or self.context.get('facility_id')
        if facility_id and start_time and end_time:
            overlapping = Booking.objects.filter(
                facility_id=facility_id,
                status='confirmed',
                start_time__lt=end_time,
                end_time__gt=start_time,
            )
            if overlapping.exists():
                raise serializers.ValidationError(
                    {'non_field_errors': 'มีการจองซ้อนในช่วงเวลานี้แล้ว'}
                )

        return data


class BookingCreateSerializer(serializers.Serializer):
    """Serializer for creating a booking via POST /api/facilities/{id}/book/."""
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()

    def validate(self, data):
        if data['end_time'] <= data['start_time']:
            raise serializers.ValidationError(
                {'end_time': 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น'}
            )

        facility_id = self.context.get('facility_id')
        if facility_id:
            overlapping = Booking.objects.filter(
                facility_id=facility_id,
                status='confirmed',
                start_time__lt=data['end_time'],
                end_time__gt=data['start_time'],
            )
            if overlapping.exists():
                raise serializers.ValidationError(
                    {'non_field_errors': 'มีการจองซ้อนในช่วงเวลานี้แล้ว'}
                )

        return data


class FacilityStatusSerializer(serializers.ModelSerializer):
    """Facility info with current availability status."""
    current_status = serializers.SerializerMethodField()

    class Meta:
        model = Facility
        fields = [
            'id', 'project_id', 'name', 'type', 'description',
            'image_url', 'operating_hours', 'requires_booking', 'is_active', 'created_at', 'current_status',
        ]
        read_only_fields = fields

    def get_current_status(self, obj):
        now = timezone.now()
        has_active_booking = Booking.objects.filter(
            facility_id=obj.id,
            status='confirmed',
            start_time__lte=now,
            end_time__gte=now,
        ).exists()
        return 'occupied' if has_active_booking else 'available'


class FacilityManageSerializer(serializers.ModelSerializer):
    """Serializer for juristic to create/update facilities."""

    class Meta:
        model = Facility
        fields = [
            'id', 'name', 'type', 'description',
            'image_url', 'operating_hours', 'requires_booking', 'is_active',
        ]
        read_only_fields = ['id']
