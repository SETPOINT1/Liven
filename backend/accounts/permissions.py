from rest_framework.permissions import BasePermission


class IsAuthenticated(BasePermission):
    """Check that request has a valid user attached by the JWT middleware."""

    def has_permission(self, request, view):
        return hasattr(request, 'user_obj') and request.user_obj is not None


class IsApproved(BasePermission):
    """Check that the authenticated user has status 'approved'."""

    def has_permission(self, request, view):
        user = getattr(request, 'user_obj', None)
        if not user:
            return False
        return user.status == 'approved'


class IsJuristic(BasePermission):
    """Check that the authenticated user has role 'juristic'."""

    def has_permission(self, request, view):
        user = getattr(request, 'user_obj', None)
        if not user:
            return False
        return user.role == 'juristic'
