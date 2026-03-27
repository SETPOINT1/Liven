import uuid
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAuthenticated, IsApproved
from chatbot.models import ChatHistory
from chatbot.serializers import ChatMessageSerializer, ChatHistorySerializer
from chatbot.gemini_service import get_chatbot_response
from notifications.utils import create_notification
from accounts.models import User


class SendMessageView(APIView):
    """POST /api/chatbot/message/

    Accepts a user message, calls Gemini, saves chat history,
    and returns the bot response.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def post(self, request):
        serializer = ChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user_obj
        user_message = serializer.validated_data['message']
        session_id = serializer.validated_data.get('session_id') or uuid.uuid4()

        # Call Gemini service
        bot_response, is_escalated = get_chatbot_response(
            user_message=user_message,
            project_id=user.project_id,
        )

        # Save chat history
        chat = ChatHistory.objects.create(
            user=user,
            session_id=session_id,
            user_message=user_message,
            bot_response=bot_response,
            is_escalated=is_escalated,
        )

        # If escalated, notify juristic persons in the project
        if is_escalated:
            juristic_users = User.objects.filter(
                project_id=user.project_id,
                role='juristic',
                status='approved',
            )
            for juristic in juristic_users:
                create_notification(
                    user_id=juristic.id,
                    notification_type='report',
                    title='Chatbot Escalation',
                    body=f'ลูกบ้าน {user.full_name} ถามคำถามที่ chatbot ตอบไม่ได้: "{user_message[:100]}"',
                    data={'chat_history_id': str(chat.id)},
                )

        return Response(
            ChatHistorySerializer(chat).data,
            status=status.HTTP_201_CREATED,
        )


class ChatHistoryView(APIView):
    """GET /api/chatbot/history/

    Returns the chat history for the authenticated user,
    ordered by most recent first.
    Supports optional ?session_id= filter.
    """
    permission_classes = [IsAuthenticated, IsApproved]

    def get(self, request):
        user = request.user_obj
        qs = ChatHistory.objects.filter(user=user).order_by('-created_at')

        session_id = request.query_params.get('session_id')
        if session_id:
            qs = qs.filter(session_id=session_id)

        serializer = ChatHistorySerializer(qs, many=True)
        return Response(serializer.data)
