from rest_framework import serializers
from social.models import Post, Comment, Like, PostReport


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for Comment model."""

    class Meta:
        model = Comment
        fields = [
            'id', 'post_id', 'author_id', 'content', 'created_at',
        ]
        read_only_fields = ['id', 'post_id', 'author_id', 'created_at']


class PostSerializer(serializers.ModelSerializer):
    """Read serializer for Post with aggregated like_count, comment_count, is_liked."""
    like_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author_id', 'project_id', 'post_type', 'content',
            'image_url', 'is_pinned', 'share_token', 'created_at',
            'like_count', 'comment_count', 'is_liked',
        ]
        read_only_fields = fields

    def get_like_count(self, obj):
        return Like.objects.filter(post_id=obj.id).count()

    def get_comment_count(self, obj):
        return Comment.objects.filter(post_id=obj.id).count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        user = getattr(request, 'user_obj', None)
        if not user:
            return False
        return Like.objects.filter(post_id=obj.id, user_id=user.id).exists()


class PostCreateSerializer(serializers.Serializer):
    """Serializer for creating a new post."""
    content = serializers.CharField()
    post_type = serializers.ChoiceField(
        choices=['normal', 'announcement', 'alert'],
        default='normal',
    )
    image_url = serializers.CharField(required=False, allow_blank=True, default='')


class CommentCreateSerializer(serializers.Serializer):
    """Serializer for creating a comment on a post."""
    content = serializers.CharField()


class PostReportSerializer(serializers.Serializer):
    """Serializer for reporting a post."""
    reason = serializers.CharField(required=False, allow_blank=True, default='')


class ShareLinkSerializer(serializers.Serializer):
    """Serializer for share link response."""
    share_token = serializers.CharField()
    share_url = serializers.CharField()
