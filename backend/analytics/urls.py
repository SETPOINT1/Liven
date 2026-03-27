from django.urls import path

from .views import (
    CommunityHealthView,
    FacilityUsageView,
    ParcelStatsView,
    ChatbotTrendsView,
)

urlpatterns = [
    path('analytics/community-health/', CommunityHealthView.as_view(), name='community-health'),
    path('analytics/facility-usage/', FacilityUsageView.as_view(), name='facility-usage'),
    path('analytics/parcel-stats/', ParcelStatsView.as_view(), name='parcel-stats'),
    path('analytics/chatbot-trends/', ChatbotTrendsView.as_view(), name='chatbot-trends'),
]
