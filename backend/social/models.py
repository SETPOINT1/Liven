import uuid
from django.db import models


class Post(models.Model):
    POST_TYPE_CHOICES = [
        ('normal', 'Normal'),
        ('announcement', 'Announcement'),
        ('alert', 'Alert'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='author_id'
    )
    project = models.ForeignKey(
        'accounts.Project', on_delete=models.CASCADE, db_column='project_id'
    )
    post_type = models.CharField(max_length=20, choices=POST_TYPE_CHOICES, default='normal')
    content = models.TextField()
    image_url = models.TextField(blank=True, null=True)
    is_pinned = models.BooleanField(default=False)
    share_token = models.CharField(max_length=64, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'posts'

    def __str__(self):
        return f"Post by {self.author_id} - {self.post_type}"


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, db_column='post_id'
    )
    author = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='author_id'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'comments'

    def __str__(self):
        return f"Comment by {self.author_id} on {self.post_id}"


class Like(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, db_column='post_id'
    )
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='user_id'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'likes'
        unique_together = [['post', 'user']]

    def __str__(self):
        return f"Like by {self.user_id} on {self.post_id}"


class PostReport(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('dismissed', 'Dismissed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(
        Post, on_delete=models.CASCADE, db_column='post_id'
    )
    reported_by = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='reported_by'
    )
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'post_reports'

    def __str__(self):
        return f"Report on {self.post_id} by {self.reported_by_id}"
