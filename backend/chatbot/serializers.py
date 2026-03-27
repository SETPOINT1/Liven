import uuid
from rest_framework import serializers
from chatbot.models import ChatHistory


class ChatMessageSerializer(serializers.Serializer):
    """Serializer for incoming chat messages from residents."""
    message = serializers.CharField(min_length=1, max_length=2000)
    session_id = serializers.UUIDField(required=False, default=uuid.uuid4)


class ChatHistorySerializer(serializers.ModelSerializer):
    """Serializer for chat history records."""

    class Meta:
        model = ChatHistory
        fields = [
            'id',
            'user',
            'session_id',
            'user_message',
            'bot_response',
            'is_escalated',
            'created_at',
        ]
        read_only_fields = fields
