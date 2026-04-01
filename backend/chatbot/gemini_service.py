import os
import logging
from google import genai
from chatbot.models import KnowledgeBase

logger = logging.getLogger(__name__)

ESCALATION_PHRASES = [
    "cannot answer", "don't know", "no information",
    "send to", "forward to",
]
ESCALATION_RESPONSE = "I'm sorry, I cannot answer this question. It will be forwarded to the juristic team."
TIMEOUT_RESPONSE = "Sorry, system error. Please try again."
MAX_RETRIES = 1

def _build_system_prompt(knowledge_entries):
    kb_text = ""
    for entry in knowledge_entries:
        category = entry.category or "General"
        kb_text += f"[{category}] Q: {entry.question}\nA: {entry.answer}\n\n"
    return (
        "You are Liven Assistant, a smart chatbot for a residential community. "
        "Answer questions about the project, rules, facilities, and services "
        "based on the knowledge base below. "
        "Reply in the same language as the user (Thai or English). "
        "If you don't have enough information, reply: "
        '"I cannot answer this question. It will be forwarded to the juristic team."\n\n'
        "=== Knowledge Base ===\n"
        f"{kb_text}"
    )

def _is_escalation_needed(response_text):
    lower = response_text.lower()
    return any(phrase.lower() in lower for phrase in ESCALATION_PHRASES)

def _call_gemini(system_prompt, user_message):
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.0-flash-lite",
        contents=f"{system_prompt}\n\nUser: {user_message}",
    )
    return response.text

def get_chatbot_response(user_message, project_id):
    knowledge_entries = list(KnowledgeBase.objects.filter(project_id=project_id))
    system_prompt = _build_system_prompt(knowledge_entries)
    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            bot_response = _call_gemini(system_prompt, user_message)
            is_escalated = _is_escalation_needed(bot_response)
            if is_escalated:
                return ESCALATION_RESPONSE, True
            return bot_response, False
        except Exception as exc:
            last_error = exc
            logger.warning("Gemini API attempt %d failed: %s", attempt + 1, exc)
    logger.error("Gemini API failed after retries: %s", last_error)
    return TIMEOUT_RESPONSE, False
