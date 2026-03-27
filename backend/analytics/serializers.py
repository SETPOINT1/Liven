"""
Serializers for the analytics app.

Provides read-only serializers for community health, facility usage,
parcel stats, and chatbot trends analytics endpoints.
"""
from rest_framework import serializers


class FacilityUsageItemSerializer(serializers.Serializer):
    facility_id = serializers.UUIDField()
    facility_name = serializers.CharField()
    booking_count = serializers.IntegerField()


class FacilityUsageSerializer(serializers.Serializer):
    """Serializer for GET /api/analytics/facility-usage/"""
    facilities = FacilityUsageItemSerializer(many=True)
    start_date = serializers.DateTimeField(allow_null=True)
    end_date = serializers.DateTimeField(allow_null=True)


class ParcelStatsSerializer(serializers.Serializer):
    """Serializer for GET /api/analytics/parcel-stats/"""
    total_received = serializers.IntegerField()
    total_picked_up = serializers.IntegerField()
    start_date = serializers.DateTimeField(allow_null=True)
    end_date = serializers.DateTimeField(allow_null=True)


class ChatbotTrendItemSerializer(serializers.Serializer):
    question = serializers.CharField()
    count = serializers.IntegerField()


class ChatbotTrendsSerializer(serializers.Serializer):
    """Serializer for GET /api/analytics/chatbot-trends/"""
    top_questions = ChatbotTrendItemSerializer(many=True)
    start_date = serializers.DateTimeField(allow_null=True)
    end_date = serializers.DateTimeField(allow_null=True)


class CommunityHealthSerializer(serializers.Serializer):
    """Serializer for GET /api/analytics/community-health/"""
    engagement_level = serializers.DictField()
    facility_stats = FacilityUsageItemSerializer(many=True)
    chatbot_trends = ChatbotTrendItemSerializer(many=True)
    satisfaction_rate = serializers.FloatField()
    start_date = serializers.DateTimeField(allow_null=True)
    end_date = serializers.DateTimeField(allow_null=True)
