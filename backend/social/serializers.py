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
    author_name = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    reports = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author_id', 'author_name', 'author_role', 'project_id', 'post_type', 'content',
            'image_url', 'is_pinned', 'share_token', 'created_at',
            'like_count', 'comment_count', 'is_liked', 'comments', 'reports',
        ]
        read_only_fields = fields

    def get_author_name(self, obj):
        try:
            return obj.author.full_name
        except Exception:
            return 'ผู้ใช้'

    def get_author_role(self, obj):
        try:
            return obj.author.role
        except Exception:
            return 'resident'

    def get_comments(self, obj):
        comments = Comment.objects.filter(post_id=obj.id).order_by('created_at')
        result = []
        for c in comments:
            try:
                author_name = c.author.full_name
            except Exception:
                author_name = 'ผู้ใช้'
            result.append({
                'id': str(c.id),
                'author_id': str(c.author_id),
                'author_name': author_name,
                'content': c.content,
                'created_at': c.created_at.isoformat() if c.created_at else None,
            })
        return result

    def get_reports(self, obj):
        # Only return reports for juristic users
        request = self.context.get('request')
        if not request:
            return []
        user = getattr(request, 'user_obj', None)
        if not user or user.role != 'juristic':
            return []
        reports = PostReport.objects.filter(post_id=obj.id).order_by('-created_at')
        result = []
        for r in reports:
            try:
                reporter_name = r.reported_by.full_name
            except Exception:
                reporter_name = 'ผู้ใช้'
            result.append({
                'id': str(r.id),
                'reported_by': str(r.reported_by_id),
                'reporter_name': reporter_name,
                'reason': r.reason or '',
                'status': r.status,
                'created_at': r.created_at.isoformat() if r.created_at else None,
            })
        return result

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
