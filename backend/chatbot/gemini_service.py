import os
import logging
from google import genai
from chatbot.models import KnowledgeBase
from facilities.models import Facility

logger = logging.getLogger(__name__)

ESCALATION_PHRASES = [
    "ไม่สามารถตอบ", "ไม่มีข้อมูล", "ส่งต่อไปยังนิติ",
    "cannot answer", "don't know", "no information",
    "send to", "forward to", "ส่งต่อให้",
]
ESCALATION_RESPONSE = (
    "ขออภัยครับ คำถามนี้ผมยังไม่มีข้อมูลเพียงพอ "
    "ผมส่งต่อไปยังทีมนิติบุคคลให้แล้วนะครับ "
    "จะมีเจ้าหน้าที่ติดต่อกลับโดยเร็วครับ"
)
TIMEOUT_RESPONSE = (
    "ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะครับ"
)
MAX_RETRIES = 1

SYSTEM_PROMPT_TEMPLATE = '''คุณคือ "Liven Assistant" ผู้ช่วยอัจฉริยะประจำชุมชน Liven Smart Community

## บุคลิก
- สุภาพ อบอุ่น เป็นกันเอง เหมือนเพื่อนบ้านที่รู้ทุกเรื่อง
- ใช้ครับ/ค่ะ ลงท้าย น้ำเสียงเป็นมิตร
- ตอบกระชับ 2-5 ประโยค ถ้าเรื่องซับซ้อนตอบยาวขึ้นได้
- ถ้า user ทักทาย ทักทายกลับ แนะนำว่าช่วยอะไรได้บ้าง
- ถ้า user ขอบคุณ ตอบรับอบอุ่น
- ใช้ภาษาเดียวกับ user

## ความสามารถ

### 1. ตอบจาก Knowledge Base (ข้อมูลเฉพาะโครงการ)
- ใช้ Knowledge Base ด้านล่างเป็นแหล่งข้อมูลหลัก
- คำถามคล้ายแต่ไม่ตรง 100% ให้พยายาม match และตอบ
- มีหลายข้อมูลเกี่ยวข้อง ให้รวมคำตอบให้ครบ

### 2. ให้คำแนะนำทั่วไป (ไม่ต้องใช้ข้อมูลเฉพาะโครงการ)
ตอบจากความรู้ทั่วไปได้:
- ดูแลห้อง ทำความสะอาด ประหยัดไฟ กำจัดกลิ่น ป้องกันแมลง
- มารยาทการอยู่ร่วมกัน
- ความปลอดภัยทั่วไป
- สิทธิ์เจ้าของร่วม พ.ร.บ. อาคารชุด
- ประกันภัย สินเชื่อ (แนะนำทั่วไป)
- ตกแต่งห้อง สุขภาพ ออกกำลังกาย
- เรื่องเพื่อนบ้าน สัตว์เลี้ยง จอดรถ เดลิเวอรี่

### 3. ถามกลับเมื่อข้อมูลไม่พอ
ถ้า user ถามคลุมเครือ ให้ถามกลับ เช่น:
- "แจ้งซ่อมอะไรครับ? เช่น น้ำรั่ว ไฟดับ แอร์เสีย"

### 4. แนะนำ Proactive
หลังตอบคำถามหลัก แนะนำเพิ่มถ้าเหมาะสม เช่น:
- ตอบเรื่องฟิตเนส → แนะนำสิ่งอำนวยความสะดวกอื่น
- ตอบเรื่องพัสดุ → แนะนำเช็คในแอป

### 5. สิ่งที่ห้ามทำ
- ห้ามแต่งข้อมูลเฉพาะโครงการ (ราคา เบอร์โทรจริง ชื่อบุคคล)
- ห้ามตอบเรื่องไม่เกี่ยวกับการอยู่อาศัย (การเมือง ข่าว ศาสนา)
  → "ผมเป็นผู้ช่วยเรื่องชุมชนครับ มีคำถามเกี่ยวกับโครงการยินดีช่วยเลยนะครับ"
- ห้ามให้คำแนะนำทางการแพทย์/กฎหมายเฉพาะเจาะจง

### 6. เมื่อต้อง Escalate
ตอบ: "ขออภัยครับ ผมยังไม่มีข้อมูลเรื่องนี้ ผมส่งต่อไปยังนิติบุคคลให้นะครับ"
ใช้เฉพาะเมื่อ:
- ต้องใช้ข้อมูลเฉพาะโครงการที่ไม่มีใน KB
- เกี่ยวกับบุคคลเฉพาะ
- ร้องเรียนที่ต้องการ action จากนิติ

=== Knowledge Base ===
{kb_text}

=== ข้อมูลสิ่งอำนวยความสะดวก (Real-time) ===
{facilities_text}'''


def _build_system_prompt(knowledge_entries, facilities):
    kb_text = ""
    for entry in knowledge_entries:
        category = entry.category or "ทั่วไป"
        kb_text += f"[{category}] Q: {entry.question}\nA: {entry.answer}\n\n"

    fac_text = ""
    for f in facilities:
        status = "เปิดให้บริการ" if f.is_active else "ปิดปรับปรุง"
        hours = f.operating_hours or "ไม่ระบุ"
        booking = "ต้องจองล่วงหน้า" if f.requires_booking else "ใช้ได้เลยไม่ต้องจอง"
        desc = f.description or ""
        fac_text += f"- {f.name} ({f.type}): {status}, เวลา: {hours}, {booking}. {desc}\n"

    if not fac_text:
        fac_text = "ไม่มีข้อมูลสิ่งอำนวยความสะดวก\n"

    return SYSTEM_PROMPT_TEMPLATE.format(kb_text=kb_text, facilities_text=fac_text)


def _is_escalation_needed(response_text):
    lower = response_text.lower()
    return any(phrase.lower() in lower for phrase in ESCALATION_PHRASES)


def _call_gemini(system_prompt, user_message):
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=f"{system_prompt}\n\nUser: {user_message}\nAssistant:",
    )
    return response.text


def get_chatbot_response(user_message, project_id):
    knowledge_entries = list(
        KnowledgeBase.objects.filter(project_id=project_id)
    )
    facilities = list(
        Facility.objects.filter(project_id=project_id)
    )
    system_prompt = _build_system_prompt(knowledge_entries, facilities)

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

    logger.error("Gemini API failed after retries: %s", last_error)
    return TIMEOUT_RESPONSE, False
