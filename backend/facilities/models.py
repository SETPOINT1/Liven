import uuid
from django.db import models


class Facility(models.Model):
    TYPE_CHOICES = [
        ('fitness', 'Fitness'),
        ('parking', 'Parking'),
        ('meeting_room', 'Meeting Room'),
        ('pool', 'Pool'),
        ('garden', 'Garden'),
        ('co_working', 'Co-Working Space'),
        ('library', 'Library'),
        ('theatre', 'Theatre'),
        ('sauna', 'Sauna & Steam Room'),
        ('sky_lounge', 'Sky Lounge'),
        ('kids_zone', 'Kids Zone'),
        ('rooftop', 'Rooftop Area'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'accounts.Project', on_delete=models.CASCADE, db_column='project_id'
    )
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    operating_hours = models.CharField(max_length=100, blank=True, null=True)
    requires_booking = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'facilities'

    def __str__(self):
        return self.name


class Booking(models.Model):
    STATUS_CHOICES = [
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, db_column='facility_id'
    )
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='user_id'
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'bookings'

    def __str__(self):
        return f"{self.facility.name} - {self.start_time} to {self.end_time}"
