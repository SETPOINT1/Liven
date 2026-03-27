from rest_framework import serializers
from parcels.models import Parcel


class ParcelSerializer(serializers.ModelSerializer):
    """Read-only serializer for all Parcel fields."""

    class Meta:
        model = Parcel
        fields = [
            'id', 'project_id', 'resident_id', 'registered_by_id',
            'recipient_name', 'unit_number', 'courier', 'tracking_number',
            'status', 'image_url', 'arrived_at', 'picked_up_at',
            'ocr_confidence', 'created_at',
        ]
        read_only_fields = fields


class ParcelCreateSerializer(serializers.Serializer):
    """Serializer for creating a new parcel (POST /api/parcels/)."""
    recipient_name = serializers.CharField(max_length=255)
    unit_number = serializers.CharField(max_length=50)
    courier = serializers.CharField(max_length=100, required=False, allow_blank=True)
    tracking_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    image_url = serializers.CharField(required=False, allow_blank=True)
    ocr_confidence = serializers.FloatField(required=False, allow_null=True)
    project_id = serializers.UUIDField()


class OCRResultSerializer(serializers.Serializer):
    """Serializer for OCR scan response."""
    recipient_name = serializers.CharField(allow_blank=True, default='')
    unit_number = serializers.CharField(allow_blank=True, default='')
    courier = serializers.CharField(allow_blank=True, default='')
    tracking_number = serializers.CharField(allow_blank=True, default='')
    confidence = serializers.FloatField(default=0.0)
