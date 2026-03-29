from django.urls import path
from accounts.views import (
    RegisterView,
    MeView,
    UserListView,
    ApproveUserView,
    RejectUserView,
    ChangeRoleView,
    JuristicRegisterView,
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/register/', JuristicRegisterView.as_view(), name='juristic-register'),
    path('users/<uuid:pk>/approve/', ApproveUserView.as_view(), name='approve-user'),
    path('users/<uuid:pk>/reject/', RejectUserView.as_view(), name='reject-user'),
    path('users/<uuid:pk>/role/', ChangeRoleView.as_view(), name='change-role'),
]
