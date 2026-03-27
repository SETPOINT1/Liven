"""
Gemini AI service for the Liven Smart Community chatbot.

Provides `get_chatbot_response(user_message, project_id)` which:
1. Loads the knowledge base for the given project.
2. Calls the Gemini API with a system prompt + knowledge base + user message.
3. Returns (bot_response, is_escalated).

Escalation: if Gemini indicates it cannot answer, is_escalated=True.
Error handling: retry once on failure; timeout → friendly error message.
"""

import os
import logging

import google.generativeai as genai

from chatbot.models import KnowledgeBase

logger = logging.getLogger(__name__)

# Escalation keywords that signal the bot cannot answer
ESCALATION_PHRASES = [
    "ไม่สามารถตอบ",
    "ไม่ทราบ",
    "ไม่มีข้อมูล",
    "ส่งต่อ",
    "I don't know",
    "I cannot answer",
    "no information",
]

ESCALATION_RESPONSE = (
    "ขออภัย ฉันไม่สามารถตอบคำถามนี้ได้ จะส่งต่อไปยังนิติบุคคล"
)

TIMEOUT_RESPONSE = "ขออภัย ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง"

MAX_RETRIES = 1


def _build_system_prompt(knowledge_entries):
    """Build a system prompt that includes the project knowledge base."""
    kb_text = ""
    for entry in knowledge_entries:
        category = entry.category or "ทั่วไป"
        kb_text += f"[{category}] Q: {entry.question}\nA: {entry.answer}\n\n"

    return (
        "คุณคือ Liven Assistant แชทบอทอัจฉริยะของโครงการที่อยู่อาศัย "
        "ตอบคำถามเกี่ยวกับข้อมูลโครงการ กฎระเบียบ สิ่งอำนวยความสะดวก "
        "และบริการต่าง ๆ โดยอ้างอิงจากฐานความรู้ด้านล่าง\n"
        "ตอบเป็นภาษาเดียวกับที่ผู้ใช้ถาม (ไทยหรืออังกฤษ)\n"
        "ถ้าไม่มีข้อมูลเพียงพอที่จะตอบ ให้ตอบว่า "
        '"ไม่สามารถตอบคำถามนี้ได้ จะส่งต่อไปยังนิติบุคคล"\n\n'
        "=== ฐานความรู้โครงการ ===\n"
        f"{kb_text}"
    )


def _is_escalation_needed(response_text):
    """Check if the response indicates the bot cannot answer."""
    lower = response_text.lower()
    for phrase in ESCALATION_PHRASES:
        if phrase.lower() in lower:
            return True
    return False


def _call_gemini(system_prompt, user_message):
    """Call the Gemini API. Raises on error."""
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        system_instruction=system_prompt,
    )
    response = model.generate_content(user_message)
    return response.text


def get_chatbot_response(user_message, project_id):
    """Main entry point: send a user message and get a bot response.

    Args:
        user_message: The message from the resident.
        project_id: UUID of the project (used to load knowledge base).

    Returns:
        tuple: (bot_response: str, is_escalated: bool)
    """
    # Load knowledge base for the project
    knowledge_entries = list(
        KnowledgeBase.objects.filter(project_id=project_id)
    )
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
            logger.warning(
                "Gemini API attempt %d failed: %s", attempt + 1, exc
            )

    # All retries exhausted
    logger.error("Gemini API failed after retries: %s", last_error)
    return TIMEOUT_RESPONSE, False
