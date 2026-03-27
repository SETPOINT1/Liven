from django.urls import path
from chatbot.views import SendMessageView, ChatHistoryView

urlpatterns = [
    path('chatbot/message/', SendMessageView.as_view(), name='chatbot-message'),
    path('chatbot/history/', ChatHistoryView.as_view(), name='chatbot-history'),
]
