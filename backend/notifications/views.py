from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.permissions import IsAuthenticated
from notifications.models import Notification
from notifications.serializers import NotificationSerializer


class NotificationListView(APIView):
    """GET /api/notifications/ — List notifications for the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Notification.objects.filter(
            user=request.user_obj,
        ).order_by('-created_at')

        # Optional filter by is_read
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() in ('true', '1'))

        serializer = NotificationSerializer(queryset, many=True)
        return Response(serializer.data)


class MarkAsReadView(APIView):
    """PATCH /api/notifications/{id}/read/ — Mark a notification as read."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user_obj)
        except Notification.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบการแจ้งเตือน'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        notification.is_read = True
        notification.save()

        return Response(NotificationSerializer(notification).data)
