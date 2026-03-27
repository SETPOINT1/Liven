import uuid
from django.db import models


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'accounts.Project', on_delete=models.CASCADE, db_column='project_id'
    )
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='created_by'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    event_date = models.DateTimeField()
    location = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'events'

    def __str__(self):
        return self.title


class Announcement(models.Model):
    PRIORITY_CHOICES = [
        ('normal', 'Normal'),
        ('important', 'Important'),
        ('emergency', 'Emergency'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'accounts.Project', on_delete=models.CASCADE, db_column='project_id'
    )
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='created_by'
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    expires_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'announcements'

    def __str__(self):
        return f"[{self.priority}] {self.title}"
