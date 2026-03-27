from django.urls import path
from parcels.views import ParcelListCreateView, OCRScanView, ParcelPickupView

urlpatterns = [
    path('parcels/', ParcelListCreateView.as_view(), name='parcel-list-create'),
    path('parcels/ocr/', OCRScanView.as_view(), name='parcel-ocr'),
    path('parcels/<uuid:pk>/pickup/', ParcelPickupView.as_view(), name='parcel-pickup'),
]
