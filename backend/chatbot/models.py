import uuid
from django.db import models


class ChatHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='user_id'
    )
    session_id = models.UUIDField()
    user_message = models.TextField()
    bot_response = models.TextField()
    is_escalated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'chat_history'

    def __str__(self):
        return f"Chat {self.session_id} - {self.user_id}"


class KnowledgeBase(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'accounts.Project', on_delete=models.CASCADE, db_column='project_id'
    )
    category = models.CharField(max_length=100, blank=True, null=True)
    question = models.TextField()
    answer = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'knowledge_base'

    def __str__(self):
        return f"[{self.category}] {self.question[:50]}"
