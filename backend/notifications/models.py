import uuid
from django.db import models


class Notification(models.Model):
    TYPE_CHOICES = [
        ('parcel', 'Parcel'),
        ('announcement', 'Announcement'),
        ('event', 'Event'),
        ('approval', 'Approval'),
        ('report', 'Report'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='user_id'
    )
    type = models.CharField(max_length=50, choices=TYPE_CHOICES, blank=True, null=True)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    data = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'notifications'

    def __str__(self):
        return f"[{self.type}] {self.title}"
