import os
import jwt
import logging
from django.conf import settings
from django.http import JsonResponse
from accounts.models import User

logger = logging.getLogger(__name__)


class SupabaseJWTMiddleware:
    """
    Middleware that verifies Supabase JWT tokens from the Authorization header
    and attaches the corresponding User to request.user.
    """

    EXEMPT_PATHS = [
        '/api/auth/register/',
        '/admin/',
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip JWT verification for exempt paths
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return self.get_response(request)

        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            logger.warning(f"[JWT] No Bearer token for {request.path}")
            return self.get_response(request)

        token = auth_header.split('Bearer ')[1].strip()
        if not token:
            logger.warning(f"[JWT] Empty token for {request.path}")
            return self.get_response(request)

        # Support test mode: skip JWT verification when TEST_MODE is set
        test_mode = getattr(settings, 'TEST_MODE', False)

        if test_mode:
            # In test mode, treat the token as a supabase_uid directly
            try:
                user = User.objects.get(supabase_uid=token)
                request.user_obj = user
            except User.DoesNotExist:
                return JsonResponse(
                    {'error': {'code': 'USER_NOT_FOUND', 'message': 'ไม่พบผู้ใช้ในระบบ'}},
                    status=401,
                )
        else:
            # Verify JWT with Supabase JWT secret
            supabase_jwt_secret = os.getenv('SUPABASE_JWT_SECRET', settings.SECRET_KEY)
            try:
                payload = jwt.decode(
                    token,
                    supabase_jwt_secret,
                    algorithms=['HS256'],
                    audience='authenticated',
                )
                supabase_uid = payload.get('sub')
                logger.info(f"[JWT] Decoded OK, sub={supabase_uid}")
                if not supabase_uid:
                    return JsonResponse(
                        {'error': {'code': 'INVALID_TOKEN', 'message': 'Token ไม่ถูกต้อง'}},
                        status=401,
                    )
                try:
                    user = User.objects.get(supabase_uid=supabase_uid)
                    request.user_obj = user
                except User.DoesNotExist:
                    return JsonResponse(
                        {'error': {'code': 'USER_NOT_FOUND', 'message': 'ไม่พบผู้ใช้ในระบบ'}},
                        status=401,
                    )
            except jwt.ExpiredSignatureError:
                logger.warning(f"[JWT] Token expired for {request.path}")
                return JsonResponse(
                    {'error': {'code': 'TOKEN_EXPIRED', 'message': 'Token หมดอายุ'}},
                    status=401,
                )
            except jwt.InvalidTokenError as e:
                logger.warning(f"[JWT] Invalid token for {request.path}: {e}")
                return JsonResponse(
                    {'error': {'code': 'INVALID_TOKEN', 'message': 'Token ไม่ถูกต้อง'}},
                    status=401,
                )

        return self.get_response(request)
