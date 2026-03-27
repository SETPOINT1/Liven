from django.urls import path
from events.views import EventListCreateView, AnnouncementListCreateView

urlpatterns = [
    path('events/', EventListCreateView.as_view(), name='event-list-create'),
    path('announcements/', AnnouncementListCreateView.as_view(), name='announcement-list-create'),
]
