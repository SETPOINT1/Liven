from rest_framework import serializers


class EventSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    project_id = serializers.UUIDField(read_only=True)
    created_by_id = serializers.UUIDField(read_only=True, source='created_by.id')
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    event_date = serializers.DateTimeField()
    location = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    image_url = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    created_at = serializers.DateTimeField(read_only=True)


class EventCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    event_date = serializers.DateTimeField()
    location = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    image_url = serializers.CharField(required=False, allow_blank=True, default='')


class AnnouncementSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    project_id = serializers.UUIDField(read_only=True)
    created_by_id = serializers.UUIDField(read_only=True, source='created_by.id')
    title = serializers.CharField()
    content = serializers.CharField()
    priority = serializers.CharField()
    expires_at = serializers.DateTimeField(allow_null=True, required=False)
    created_at = serializers.DateTimeField(read_only=True)


class AnnouncementCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    content = serializers.CharField()
    priority = serializers.ChoiceField(
        choices=['normal', 'important', 'emergency'],
        default='normal',
    )
    expires_at = serializers.DateTimeField(required=False, allow_null=True, default=None)
