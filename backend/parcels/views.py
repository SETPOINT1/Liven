from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from parcels.models import Parcel
from parcels.serializers import ParcelSerializer, ParcelCreateSerializer, OCRResultSerializer
from accounts.models import User
from accounts.permissions import IsAuthenticated, IsApproved, IsJuristic
from notifications.utils import create_notification


class ParcelListCreateView(APIView):
    """
    GET  /api/parcels/ — List parcels.
        Residents see only their own parcels.
        Juristic users see all parcels in their project.
    POST /api/parcels/ — Create a new parcel (juristic only).
        Also creates a notification for the resident matching unit_number.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        user = request.user_obj

        if user.role == 'juristic':
            queryset = Parcel.objects.filter(project_id=user.project_id)
        else:
            queryset = Parcel.objects.filter(resident_id=user.id)

        # Optional status filter
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        queryset = queryset.order_by('-arrived_at')
        serializer = ParcelSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Only juristic users can create parcels
        if request.user_obj.role != 'juristic':
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'เฉพาะนิติบุคคลเท่านั้นที่สามารถบันทึกพัสดุได้'}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ParcelCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        project_id = data['project_id']
        unit_number = data['unit_number']

        # Find resident by unit_number in the same project
        resident = User.objects.filter(
            project_id=project_id,
            unit_number=unit_number,
            role='resident',
            status='approved',
        ).first()

        parcel = Parcel.objects.create(
            project_id=project_id,
            resident=resident,
            registered_by=request.user_obj,
            recipient_name=data['recipient_name'],
            unit_number=unit_number,
            courier=data.get('courier', ''),
            tracking_number=data.get('tracking_number', ''),
            image_url=data.get('image_url', ''),
            ocr_confidence=data.get('ocr_confidence'),
            status='pending',
        )

        # Create notification for the resident
        if resident:
            create_notification(
                user_id=resident.id,
                notification_type='parcel',
                title='พัสดุมาถึงแล้ว',
                body=f'พัสดุจาก {data.get("courier", "ไม่ระบุ") or "ไม่ระบุ"} มาถึงโครงการแล้ว',
                data={
                    'parcel_id': str(parcel.id),
                    'tracking_number': data.get('tracking_number', ''),
                },
            )

        return Response(ParcelSerializer(parcel).data, status=status.HTTP_201_CREATED)


class OCRScanView(APIView):
    """POST /api/parcels/ocr/ — OCR scan endpoint.
    Accepts an image and returns structured parcel data via
    Azure Computer Vision + Typhoon pipeline.
    Requirements: 9.1, 9.2, 9.4, 9.5
    """
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def post(self, request):
        image_file = request.FILES.get('image')
        if not image_file:
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'กรุณาอัปโหลดรูปภาพพัสดุ'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from parcels.ocr_service import scan_parcel_image

        image_data = image_file.read()
        result = scan_parcel_image(image_data)

        serializer = OCRResultSerializer(result)
        return Response(serializer.data)


class ParcelPickupView(APIView):
    """PATCH /api/parcels/{id}/pickup/ — Confirm parcel pickup.
    Sets status to 'picked_up' and records picked_up_at timestamp.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def patch(self, request, pk):
        try:
            parcel = Parcel.objects.get(pk=pk)
        except Parcel.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบพัสดุ'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if parcel.status == 'picked_up':
            return Response(
                {'error': {'code': 'ALREADY_PICKED_UP', 'message': 'พัสดุนี้ถูกรับไปแล้ว'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parcel.status = 'picked_up'
        parcel.picked_up_at = timezone.now()
        parcel.save()

        return Response(ParcelSerializer(parcel).data)
