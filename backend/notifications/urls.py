from django.urls import path
from notifications.views import NotificationListView, MarkAsReadView

urlpatterns = [
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<uuid:pk>/read/', MarkAsReadView.as_view(), name='notification-read'),
]
