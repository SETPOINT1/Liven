from rest_framework import serializers
from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'user_id', 'type', 'title', 'body',
            'is_read', 'data', 'created_at',
        ]
        read_only_fields = fields
