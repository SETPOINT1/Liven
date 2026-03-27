from django.urls import path
from social.views import (
    PostListCreateView,
    LikeView,
    CommentCreateView,
    ReportPostView,
    ShareLinkView,
)

urlpatterns = [
    path('posts/', PostListCreateView.as_view(), name='post-list-create'),
    path('posts/<uuid:pk>/like/', LikeView.as_view(), name='post-like'),
    path('posts/<uuid:pk>/comments/', CommentCreateView.as_view(), name='post-comment'),
    path('posts/<uuid:pk>/report/', ReportPostView.as_view(), name='post-report'),
    path('posts/<uuid:pk>/share-link/', ShareLinkView.as_view(), name='post-share-link'),
]
