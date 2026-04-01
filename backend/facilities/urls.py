from django.urls import path
from facilities.views import (
    FacilityListView,
    FacilityStatusView,
    BookFacilityView,
    BookingListView,
    FacilityManageView,
    FacilityManageDetailView,
    BookingManageView,
    BookingCancelView,
)

urlpatterns = [
    path('facilities/', FacilityListView.as_view(), name='facility-list'),
    path('facilities/<uuid:pk>/status/', FacilityStatusView.as_view(), name='facility-status'),
    path('facilities/<uuid:pk>/book/', BookFacilityView.as_view(), name='book-facility'),
    path('bookings/', BookingListView.as_view(), name='booking-list'),
    # Juristic management
    path('manage/facilities/', FacilityManageView.as_view(), name='facility-manage'),
    path('manage/facilities/<uuid:pk>/', FacilityManageDetailView.as_view(), name='facility-manage-detail'),
    path('manage/bookings/', BookingManageView.as_view(), name='booking-manage'),
    path('manage/bookings/<uuid:pk>/cancel/', BookingCancelView.as_view(), name='booking-cancel'),
]
