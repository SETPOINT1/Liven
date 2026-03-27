"""
Views for the analytics app.

All views require IsAuthenticated + IsApproved.
All views accept optional start_date and end_date query params (ISO format).
"""
from django.db.models import Count
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticated, IsApproved
from chatbot.models import ChatHistory
from facilities.models import Booking, Facility
from parcels.models import Parcel
from social.models import Post, Comment, PostReport

from .serializers import (
    CommunityHealthSerializer,
    ChatbotTrendsSerializer,
    FacilityUsageSerializer,
    ParcelStatsSerializer,
)


def _parse_date_range(request):
    """Parse optional start_date and end_date from query params.

    Handles URL-encoded '+' (which becomes space) in timezone offsets.
    """
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    if start_date:
        start_date = parse_datetime(start_date)
        if start_date is None:
            # Retry: URL decoding may have turned '+' into space
            raw = request.query_params.get('start_date', '').replace(' ', '+')
            start_date = parse_datetime(raw)
    if end_date:
        end_date = parse_datetime(end_date)
        if end_date is None:
            raw = request.query_params.get('end_date', '').replace(' ', '+')
            end_date = parse_datetime(raw)
    return start_date, end_date


def _get_facility_stats(project, start_date, end_date):
    """Get booking counts per facility within date range."""
    facilities = Facility.objects.filter(project=project)
    result = []
    for facility in facilities:
        qs = Booking.objects.filter(facility=facility, status='confirmed')
        if start_date:
            qs = qs.filter(start_time__gte=start_date)
        if end_date:
            qs = qs.filter(start_time__lte=end_date)
        result.append({
            'facility_id': facility.id,
            'facility_name': facility.name,
            'booking_count': qs.count(),
        })
    return result


def _get_chatbot_trends(project, start_date, end_date):
    """Get top 10 most asked questions grouped by user_message."""
    qs = ChatHistory.objects.filter(user__project=project)
    if start_date:
        qs = qs.filter(created_at__gte=start_date)
    if end_date:
        qs = qs.filter(created_at__lte=end_date)
    top = (
        qs.values('user_message')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    return [
        {'question': item['user_message'], 'count': item['count']}
        for item in top
    ]


def _get_engagement_level(project, start_date, end_date):
    """Calculate engagement level: post count + comment count + booking count."""
    post_qs = Post.objects.filter(project=project)
    comment_qs = Comment.objects.filter(post__project=project)
    booking_qs = Booking.objects.filter(
        facility__project=project, status='confirmed',
    )
    if start_date:
        post_qs = post_qs.filter(created_at__gte=start_date)
        comment_qs = comment_qs.filter(created_at__gte=start_date)
        booking_qs = booking_qs.filter(start_time__gte=start_date)
    if end_date:
        post_qs = post_qs.filter(created_at__lte=end_date)
        comment_qs = comment_qs.filter(created_at__lte=end_date)
        booking_qs = booking_qs.filter(start_time__lte=end_date)

    post_count = post_qs.count()
    comment_count = comment_qs.count()
    booking_count = booking_qs.count()
    return {
        'post_count': post_count,
        'comment_count': comment_count,
        'booking_count': booking_count,
        'total': post_count + comment_count + booking_count,
    }


def _get_satisfaction_rate(project, start_date, end_date):
    """
    Calculate satisfaction rate (0-100) from engagement and report ratio.

    Formula: 100 * (1 - report_count / max(total_engagement, 1))
    Clamped to [0, 100].
    """
    engagement = _get_engagement_level(project, start_date, end_date)
    total = engagement['total']

    report_qs = PostReport.objects.filter(post__project=project)
    if start_date:
        report_qs = report_qs.filter(created_at__gte=start_date)
    if end_date:
        report_qs = report_qs.filter(created_at__lte=end_date)
    report_count = report_qs.count()

    if total == 0 and report_count == 0:
        return 100.0
    rate = 100.0 * (1 - report_count / max(total, 1))
    return max(0.0, min(100.0, round(rate, 2)))


class CommunityHealthView(APIView):
    """GET /api/analytics/community-health/

    Returns engagement_level, facility_stats, chatbot_trends,
    and satisfaction_rate for the authenticated user's project.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        user = request.user_obj
        project = user.project
        if not project:
            return Response(
                {'error': 'User has no project assigned'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        start_date, end_date = _parse_date_range(request)
        data = {
            'engagement_level': _get_engagement_level(project, start_date, end_date),
            'facility_stats': _get_facility_stats(project, start_date, end_date),
            'chatbot_trends': _get_chatbot_trends(project, start_date, end_date),
            'satisfaction_rate': _get_satisfaction_rate(project, start_date, end_date),
            'start_date': start_date,
            'end_date': end_date,
        }
        serializer = CommunityHealthSerializer(data)
        return Response(serializer.data)


class FacilityUsageView(APIView):
    """GET /api/analytics/facility-usage/

    Returns booking counts per facility within date range.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        user = request.user_obj
        project = user.project
        if not project:
            return Response(
                {'error': 'User has no project assigned'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        start_date, end_date = _parse_date_range(request)
        data = {
            'facilities': _get_facility_stats(project, start_date, end_date),
            'start_date': start_date,
            'end_date': end_date,
        }
        serializer = FacilityUsageSerializer(data)
        return Response(serializer.data)


class ParcelStatsView(APIView):
    """GET /api/analytics/parcel-stats/

    Returns parcel counts (received/picked_up) within date range.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        user = request.user_obj
        project = user.project
        if not project:
            return Response(
                {'error': 'User has no project assigned'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        start_date, end_date = _parse_date_range(request)

        parcel_qs = Parcel.objects.filter(project=project)
        if start_date:
            parcel_qs = parcel_qs.filter(arrived_at__gte=start_date)
        if end_date:
            parcel_qs = parcel_qs.filter(arrived_at__lte=end_date)

        total_received = parcel_qs.filter(status='pending').count()
        total_picked_up = parcel_qs.filter(status='picked_up').count()

        data = {
            'total_received': total_received,
            'total_picked_up': total_picked_up,
            'start_date': start_date,
            'end_date': end_date,
        }
        serializer = ParcelStatsSerializer(data)
        return Response(serializer.data)


class ChatbotTrendsView(APIView):
    """GET /api/analytics/chatbot-trends/

    Returns top 10 most asked questions.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        user = request.user_obj
        project = user.project
        if not project:
            return Response(
                {'error': 'User has no project assigned'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        start_date, end_date = _parse_date_range(request)
        data = {
            'top_questions': _get_chatbot_trends(project, start_date, end_date),
            'start_date': start_date,
            'end_date': end_date,
        }
        serializer = ChatbotTrendsSerializer(data)
        return Response(serializer.data)
