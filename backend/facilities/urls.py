from django.urls import path
from facilities.views import (
    FacilityListView,
    FacilityStatusView,
    BookFacilityView,
    BookingListView,
)

urlpatterns = [
    path('facilities/', FacilityListView.as_view(), name='facility-list'),
    path('facilities/<uuid:pk>/status/', FacilityStatusView.as_view(), name='facility-status'),
    path('facilities/<uuid:pk>/book/', BookFacilityView.as_view(), name='book-facility'),
    path('bookings/', BookingListView.as_view(), name='booking-list'),
]
