"""
URL configuration for liven project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('facilities.urls')),
    path('api/', include('parcels.urls')),
    path('api/', include('social.urls')),
    path('api/', include('events.urls')),
    path('api/', include('chatbot.urls')),
    path('api/', include('analytics.urls')),
    path('api/', include('notifications.urls')),
]
