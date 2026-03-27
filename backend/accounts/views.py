from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.models import User
from accounts.serializers import (
    RegisterSerializer,
    UserSerializer,
    UserApprovalSerializer,
    RoleChangeSerializer,
)
from accounts.permissions import IsAuthenticated, IsApproved, IsJuristic
from notifications.utils import create_notification


class RegisterView(APIView):
    """POST /api/auth/register/ — Register a new user."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = serializer.save()

        # Notify juristic users in the same project
        if user.project_id:
            juristic_users = User.objects.filter(
                project_id=user.project_id,
                role='juristic',
                status='approved',
            )
            for juristic in juristic_users:
                create_notification(
                    user_id=juristic.id,
                    notification_type='approval',
                    title='คำขอลงทะเบียนใหม่',
                    body=f'{user.full_name} ({user.email}) ขอลงทะเบียนเข้าใช้งานระบบ',
                    data={'user_id': str(user.id)},
                )

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    """GET /api/auth/me/ — Return current user info."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user_obj).data)


class UserListView(APIView):
    """GET /api/users/ — List all users (juristic only), filterable by status."""
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def get(self, request):
        queryset = User.objects.all()

        # Filter by project if the juristic user belongs to one
        if request.user_obj.project_id:
            queryset = queryset.filter(project_id=request.user_obj.project_id)

        # Optional status filter
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        queryset = queryset.order_by('-created_at')
        serializer = UserSerializer(queryset, many=True)
        return Response(serializer.data)


class ApproveUserView(APIView):
    """PATCH /api/users/{id}/approve/ — Approve a user."""
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบผู้ใช้'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.status = 'approved'
        user.save()

        create_notification(
            user_id=user.id,
            notification_type='approval',
            title='บัญชีได้รับการอนุมัติ',
            body='บัญชีของคุณได้รับการอนุมัติแล้ว คุณสามารถเข้าใช้งานระบบได้',
            data={'status': 'approved'},
        )

        return Response(UserSerializer(user).data)


class RejectUserView(APIView):
    """PATCH /api/users/{id}/reject/ — Reject a user."""
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบผู้ใช้'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.status = 'rejected'
        user.save()

        create_notification(
            user_id=user.id,
            notification_type='approval',
            title='บัญชีถูกปฏิเสธ',
            body='บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อนิติบุคคลสำหรับข้อมูลเพิ่มเติม',
            data={'status': 'rejected'},
        )

        return Response(UserSerializer(user).data)


class ChangeRoleView(APIView):
    """PATCH /api/users/{id}/role/ — Change user role (juristic only)."""
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'ไม่พบผู้ใช้'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = RoleChangeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'ข้อมูลไม่ถูกต้อง', 'details': serializer.errors}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.role = serializer.validated_data['role']
        user.save()

        return Response(UserSerializer(user).data)
