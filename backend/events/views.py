from django.db.models import Case, When, IntegerField
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from events.models import Event, Announcement
from events.serializers import (
    EventSerializer,
    EventCreateSerializer,
    AnnouncementSerializer,
    AnnouncementCreateSerializer,
)
from accounts.permissions import IsAuthenticated, IsApproved
from notifications.utils import notify_all_residents


PRIORITY_ORDER = Case(
    When(priority='emergency', then=0),
    When(priority='important', then=1),
    When(priority='normal', then=2),
    default=3,
    output_field=IntegerField(),
)


class EventListCreateView(APIView):
    """
    GET  /api/events/ — List events for the user's project, ordered by created_at DESC.
    POST /api/events/ — Create an event (juristic only) and notify all approved residents.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        user = request.user_obj
        queryset = Event.objects.filter(
            project_id=user.project_id,
        ).order_by('-created_at')
        serializer = EventSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        user = request.user_obj
        if user.role != 'juristic':
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'เฉพาะนิติบุคคลเท่านั้นที่สามารถสร้างกิจกรรมได้'}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EventCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        event = Event.objects.create(
            project_id=user.project_id,
            created_by=user,
            title=data['title'],
            description=data.get('description', ''),
            event_date=data['event_date'],
            location=data.get('location', ''),
            image_url=data.get('image_url', ''),
        )

        # Notify all approved residents in the project
        notify_all_residents(
            project_id=user.project_id,
            notification_type='event',
            title=f'กิจกรรมใหม่: {event.title}',
            body=event.description or event.title,
            data={'event_id': str(event.id)},
        )

        return Response(EventSerializer(event).data, status=status.HTTP_201_CREATED)


class AnnouncementListCreateView(APIView):
    """
    GET  /api/announcements/ — List announcements for the user's project,
         ordered by priority (emergency > important > normal) then created_at DESC.
    POST /api/announcements/ — Create an announcement (juristic only) and notify
         all approved residents.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        user = request.user_obj
        queryset = Announcement.objects.filter(
            project_id=user.project_id,
        ).annotate(
            priority_order=PRIORITY_ORDER,
        ).order_by('priority_order', '-created_at')
        serializer = AnnouncementSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        user = request.user_obj
        if user.role != 'juristic':
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'เฉพาะนิติบุคคลเท่านั้นที่สามารถสร้างประกาศได้'}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AnnouncementCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        announcement = Announcement.objects.create(
            project_id=user.project_id,
            created_by=user,
            title=data['title'],
            content=data['content'],
            priority=data.get('priority', 'normal'),
            expires_at=data.get('expires_at'),
        )

        # Notify all approved residents in the project
        notify_all_residents(
            project_id=user.project_id,
            notification_type='announcement',
            title=f'ประกาศ: {announcement.title}',
            body=announcement.content,
            data={
                'announcement_id': str(announcement.id),
                'priority': announcement.priority,
            },
        )

        return Response(
            AnnouncementSerializer(announcement).data,
            status=status.HTTP_201_CREATED,
        )
