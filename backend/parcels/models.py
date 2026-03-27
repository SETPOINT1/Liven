import uuid
from django.db import models


class Parcel(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('picked_up', 'Picked Up'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'accounts.Project', on_delete=models.CASCADE, db_column='project_id'
    )
    resident = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='parcels_owned', db_column='resident_id'
    )
    registered_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='parcels_registered', db_column='registered_by'
    )
    recipient_name = models.CharField(max_length=255, blank=True, null=True)
    unit_number = models.CharField(max_length=50, blank=True, null=True)
    courier = models.CharField(max_length=100, blank=True, null=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    image_url = models.TextField(blank=True, null=True)
    arrived_at = models.DateTimeField(auto_now_add=True)
    picked_up_at = models.DateTimeField(blank=True, null=True)
    ocr_confidence = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'parcels'

    def __str__(self):
        return f"Parcel for {self.recipient_name} ({self.unit_number})"
