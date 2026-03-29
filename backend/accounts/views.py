import os
import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from supabase import create_client
from accounts.models import User
from accounts.serializers import (
    RegisterSerializer,
    UserSerializer,
    UserApprovalSerializer,
    RoleChangeSerializer,
)
from accounts.permissions import IsAuthenticated, IsApproved, IsJuristic
from notifications.utils import create_notification

logger = logging.getLogger(__name__)


def get_supabase_admin():
    url = os.getenv('SUPABASE_URL', '')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
    return create_client(url, key)


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

        # Filter by project — include users with same project OR no project (new registrations)
        if request.user_obj.project_id:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(project_id=request.user_obj.project_id) | Q(project_id__isnull=True)
            )

        # Optional status filter
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Order: pending first, then by newest
        from django.db.models import Case, When, IntegerField
        queryset = queryset.annotate(
            status_order=Case(
                When(status='pending', then=0),
                When(status='approved', then=1),
                When(status='suspended', then=2),
                When(status='rejected', then=3),
                default=4,
                output_field=IntegerField(),
            )
        ).order_by('status_order', '-created_at')

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
        # Assign project if user doesn't have one
        if not user.project_id and request.user_obj.project_id:
            user.project_id = request.user_obj.project_id
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


class JuristicRegisterView(APIView):
    """POST /api/users/register/ — Juristic registers a resident.
    
    Creates Supabase auth user + DB user in one step.
    Auto-assigns the juristic's project and sets status to approved.
    """
    permission_classes = [IsAuthenticated, IsApproved, IsJuristic]

    def post(self, request):
        data = request.data
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        full_name = data.get('full_name', '').strip()
        phone = data.get('phone', '').strip()
        unit_number = data.get('unit_number', '').strip()
        role = data.get('role', 'resident')

        if not email or not password or not full_name:
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'กรุณากรอก อีเมล, รหัสผ่าน และชื่อ'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {'error': {'code': 'DUPLICATE_EMAIL', 'message': 'อีเมลนี้ถูกใช้งานแล้ว'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create Supabase auth user
        try:
            sb = get_supabase_admin()
            auth_response = sb.auth.admin.create_user({
                'email': email,
                'password': password,
                'email_confirm': True,
            })
            supabase_uid = auth_response.user.id
        except Exception as e:
            logger.error(f"[Register] Supabase auth error: {e}")
            return Response(
                {'error': {'code': 'AUTH_ERROR', 'message': f'สร้างบัญชีไม่สำเร็จ: {str(e)}'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create DB user with juristic's project
        juristic_user = request.user_obj
        try:
            user = User.objects.create(
                email=email,
                full_name=full_name,
                phone=phone,
                unit_number=unit_number,
                supabase_uid=supabase_uid,
                role=role if role in ('resident', 'juristic') else 'resident',
                status='approved',
                project_id=juristic_user.project_id,
            )
        except Exception as e:
            logger.error(f"[Register] DB error: {e}")
            return Response(
                {'error': {'code': 'DB_ERROR', 'message': f'บันทึกข้อมูลไม่สำเร็จ: {str(e)}'}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
