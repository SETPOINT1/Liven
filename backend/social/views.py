import uuid

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from social.models import Post, Comment, Like, PostReport
from social.serializers import (
    PostSerializer,
    PostCreateSerializer,
    CommentSerializer,
    CommentCreateSerializer,
    PostReportSerializer,
    ShareLinkSerializer,
)
from accounts.models import User
from accounts.permissions import IsAuthenticated, IsApproved
from notifications.utils import create_notification


class PostListCreateView(APIView):
    """
    GET  /api/posts/ — List posts for the user's project.
         Feed ordering: pinned (alert) posts first, then by created_at DESC.
         Project-scoped: users only see posts in their own project.
    POST /api/posts/ — Create a new post.
         Generates a unique share_token (uuid hex).
         Sets is_pinned=True for alert type posts.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        user = request.user_obj
        queryset = Post.objects.filter(
            project_id=user.project_id,
        ).select_related('author').order_by('-is_pinned', '-created_at')

        serializer = PostSerializer(
            queryset, many=True, context={'request': request},
        )
        return Response(serializer.data)

    def post(self, request):
        serializer = PostCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        user = request.user_obj
        post_type = data['post_type']

        # Alert posts are automatically pinned
        is_pinned = post_type == 'alert'

        # Generate unique share token
        share_token = uuid.uuid4().hex[:32]

        post = Post.objects.create(
            author=user,
            project_id=user.project_id,
            post_type=post_type,
            content=data['content'],
            image_url=data.get('image_url', ''),
            is_pinned=is_pinned,
            share_token=share_token,
        )

        return Response(
            PostSerializer(post, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class LikeView(APIView):
    """POST /api/posts/{id}/like/ — Toggle like on a post.

    If the user already liked the post, unlike it (delete).
    If the user hasn't liked the post, like it (create).
    Idempotent via unique constraint (post_id, user_id).
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def post(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบโพสต์'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user_obj
        existing_like = Like.objects.filter(post=post, user=user).first()

        if existing_like:
            existing_like.delete()
            liked = False
        else:
            Like.objects.create(post=post, user=user)
            liked = True

        like_count = Like.objects.filter(post=post).count()
        return Response({'liked': liked, 'like_count': like_count})


class CommentCreateView(APIView):
    """POST /api/posts/{id}/comments/ — Create a comment on a post."""
    permission_classes = [IsAuthenticated, IsApproved]

    def post(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบโพสต์'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = CommentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment = Comment.objects.create(
            post=post,
            author=request.user_obj,
            content=serializer.validated_data['content'],
        )

        return Response(
            CommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )


class ReportPostView(APIView):
    """POST /api/posts/{id}/report/ — Report a post.

    Creates a PostReport and sends a notification to all juristic users
    in the same project.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def post(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบโพสต์'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PostReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user_obj
        report = PostReport.objects.create(
            post=post,
            reported_by=user,
            reason=serializer.validated_data.get('reason', ''),
            status='pending',
        )

        # Notify all juristic users in the same project
        juristic_users = User.objects.filter(
            project_id=post.project_id,
            role='juristic',
            status='approved',
        )
        for juristic_user in juristic_users:
            create_notification(
                user_id=juristic_user.id,
                notification_type='report',
                title='มีการรายงานโพสต์',
                body=f'โพสต์ถูกรายงานโดย {user.full_name}: {report.reason or "ไม่ระบุเหตุผล"}',
                data={
                    'post_id': str(post.id),
                    'report_id': str(report.id),
                },
            )

        return Response(
            {'message': 'รายงานโพสต์สำเร็จ', 'report_id': str(report.id)},
            status=status.HTTP_201_CREATED,
        )


class ShareLinkView(APIView):
    """GET /api/posts/{id}/share-link/ — Get share link for a post.

    Returns the share_token and a constructed share_url.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบโพสต์'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        share_token = post.share_token or ''
        # Build share URL from request host
        host = request.META.get('HTTP_HOST', 'localhost')
        scheme = 'https' if request.is_secure() else 'http'
        share_url = f'{scheme}://{host}/posts/shared/{share_token}'

        serializer = ShareLinkSerializer({
            'share_token': share_token,
            'share_url': share_url,
        })
        return Response(serializer.data)

class DeletePostView(APIView):
    """DELETE /api/posts/{id}/ — Delete a post. Juristic can delete any post in their project."""
    permission_classes = [IsAuthenticated, IsApproved]

    def delete(self, request, pk):
        try:
            post = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบโพสต์'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user_obj
        # Juristic can delete any post in their project, others can only delete their own
        if user.role == 'juristic' or post.author_id == user.id:
            post.delete()
            return Response({'message': 'ลบโพสต์สำเร็จ'}, status=status.HTTP_200_OK)

        return Response(
            {'error': {'code': 'FORBIDDEN', 'message': 'ไม่มีสิทธิ์ลบโพสต์นี้'}},
            status=status.HTTP_403_FORBIDDEN,
        )


class DeleteCommentView(APIView):
    """DELETE /api/posts/{post_id}/comments/{comment_id}/ — Delete a comment."""
    permission_classes = [IsAuthenticated, IsApproved]

    def delete(self, request, post_id, comment_id):
        try:
            comment = Comment.objects.get(pk=comment_id, post_id=post_id)
        except Comment.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบความคิดเห็น'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user_obj
        if user.role == 'juristic' or comment.author_id == user.id:
            comment.delete()
            return Response({'message': 'ลบความคิดเห็นสำเร็จ'}, status=status.HTTP_200_OK)

        return Response(
            {'error': {'code': 'FORBIDDEN', 'message': 'ไม่มีสิทธิ์ลบความคิดเห็นนี้'}},
            status=status.HTTP_403_FORBIDDEN,
        )


class UpdateReportView(APIView):
    """PATCH /api/posts/{post_id}/report/{report_id}/ — Update report status."""
    permission_classes = [IsAuthenticated, IsApproved]

    def patch(self, request, post_id, report_id):
        user = request.user_obj
        if user.role != 'juristic':
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'เฉพาะนิติบุคคลเท่านั้น'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            report = PostReport.objects.get(pk=report_id, post_id=post_id)
        except PostReport.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบรายงาน'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_status = request.data.get('status')
        if new_status not in ('reviewed', 'dismissed'):
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'สถานะไม่ถูกต้อง'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.status = new_status
        report.save()
        return Response({'message': 'อัพเดตสถานะสำเร็จ', 'status': report.status})
