import os
import jwt
import logging
from jwt import PyJWKClient
from django.conf import settings
from django.http import JsonResponse
from accounts.models import User

logger = logging.getLogger(__name__)

# Cache the JWKS client to avoid fetching keys on every request
_jwks_client = None


def get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        supabase_url = os.getenv('SUPABASE_URL', '').rstrip('/')
        jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


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
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return self.get_response(request)

        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return self.get_response(request)

        token = auth_header.split('Bearer ')[1].strip()
        if not token:
            return self.get_response(request)

        test_mode = getattr(settings, 'TEST_MODE', False)

        if test_mode:
            try:
                user = User.objects.get(supabase_uid=token)
                request.user_obj = user
            except User.DoesNotExist:
                return JsonResponse(
                    {'error': {'code': 'USER_NOT_FOUND', 'message': 'ไม่พบผู้ใช้ในระบบ'}},
                    status=401,
                )
        else:
            try:
                # Try ES256 (asymmetric) via JWKS first
                jwks_client = get_jwks_client()
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=['ES256'],
                    audience='authenticated',
                )
            except Exception:
                # Fallback to HS256 (symmetric) with JWT secret
                supabase_jwt_secret = os.getenv(
                    'SUPABASE_JWT_SECRET', settings.SECRET_KEY
                )
                try:
                    payload = jwt.decode(
                        token,
                        supabase_jwt_secret,
                        algorithms=['HS256'],
                        audience='authenticated',
                    )
                except jwt.ExpiredSignatureError:
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

            supabase_uid = payload.get('sub')
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

        return self.get_response(request)
