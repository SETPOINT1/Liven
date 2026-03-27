"""
Property-based tests for the chatbot app.

Covers:
- Property 16: ประวัติ Chatbot ถูกบันทึกทุกครั้ง
"""
import uuid
from unittest.mock import patch

from django.test import override_settings
from hypothesis import given, settings as hypothesis_settings
from hypothesis import strategies as st
from hypothesis.extra.django import TestCase

from accounts.models import Project, User
from chatbot.models import ChatHistory


# --- Reusable strategies ---

message_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'Zs', 'P')),
    min_size=1,
    max_size=200,
).filter(lambda s: s.strip() != '')

bot_response_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N', 'Zs', 'P')),
    min_size=1,
    max_size=500,
).filter(lambda s: s.strip() != '')

is_escalated_strategy = st.booleans()


@override_settings(TEST_MODE=True)
class ChatbotHistorySavedEveryTimeTest(TestCase):
    """
    Property 16: ประวัติ Chatbot ถูกบันทึกทุกครั้ง

    For every message sent to the chatbot, a ChatHistory record is created
    with non-empty user_message and bot_response.

    **Validates: Requirements 8.4, 8.5**
    """

    def setUp(self):
        self.project = Project.objects.create(name='Test Project', address='Addr')
        self.resident_uid = uuid.uuid4()
        self.resident = User.objects.create(
            email='resident_chatbot@example.com',
            full_name='Resident Chatbot',
            role='resident',
            status='approved',
            supabase_uid=self.resident_uid,
            project=self.project,
        )

    @given(
        user_message=message_strategy,
        mock_bot_response=bot_response_strategy,
        mock_is_escalated=is_escalated_strategy,
    )
    @hypothesis_settings(max_examples=50, deadline=10000)
    def test_every_message_creates_chat_history(
        self, user_message, mock_bot_response, mock_is_escalated,
    ):
        """
        Property 16: ประวัติ Chatbot ถูกบันทึกทุกครั้ง

        **Validates: Requirements 8.4, 8.5**
        """
        count_before = ChatHistory.objects.filter(user=self.resident).count()

        auth = f'Bearer {self.resident_uid}'

        with patch(
            'chatbot.views.get_chatbot_response',
            return_value=(mock_bot_response, mock_is_escalated),
        ):
            resp = self.client.post(
                '/api/chatbot/message/',
                data={'message': user_message},
                content_type='application/json',
                HTTP_AUTHORIZATION=auth,
            )

        self.assertEqual(resp.status_code, 201, resp.content)

        count_after = ChatHistory.objects.filter(user=self.resident).count()
        self.assertEqual(
            count_after,
            count_before + 1,
            'Exactly one ChatHistory record should be created per message',
        )

        # Verify the saved record
        latest = ChatHistory.objects.filter(user=self.resident).order_by('-created_at').first()
        self.assertIsNotNone(latest)
        # DRF CharField strips whitespace by default, so compare against stripped value
        self.assertEqual(latest.user_message, user_message.strip())
        self.assertTrue(len(latest.user_message) > 0, 'user_message must not be empty')
        self.assertEqual(latest.bot_response, mock_bot_response)
        self.assertTrue(len(latest.bot_response) > 0, 'bot_response must not be empty')
        self.assertEqual(latest.is_escalated, mock_is_escalated)
