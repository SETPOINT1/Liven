"""
OCR Pipeline Service — Typhoon OCR + Typhoon LLM (with Azure CV fallback).

Primary:  Typhoon OCR 1.5 reads parcel label images (optimized for Thai).
Fallback: Azure Computer Vision Read API.
Then:     Typhoon v2.5 LLM parses the raw text into structured fields.

Requirements: 9.1, 9.2, 9.4, 9.5
"""
import base64
import json
import logging
import tempfile
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Confidence threshold: >= 60% returns data, < 60% returns empty form
CONFIDENCE_THRESHOLD = 0.60

# Azure CV polling settings
_POLL_INTERVAL = 1  # seconds
_POLL_MAX_ATTEMPTS = 30

# Typhoon endpoints
_TYPHOON_CHAT_URL = "https://api.opentyphoon.ai/v1/chat/completions"
_TYPHOON_LLM_MODEL = "typhoon-v2.5-30b-a3b-instruct"


def scan_parcel_image(image_data: bytes) -> dict:
    """Main entry point — scan a parcel label image and return structured data.

    Pipeline:
        1. Try Typhoon OCR first (best for Thai text).
        2. Fall back to Azure CV if Typhoon OCR fails.
        3. Use Typhoon LLM to parse raw text into structured fields.

    Returns:
        dict with keys: recipient_name, unit_number, courier,
        tracking_number, confidence.
        If confidence < 60%, all text fields are empty strings.
    """
    empty_result = {
        "recipient_name": "",
        "unit_number": "",
        "courier": "",
        "tracking_number": "",
        "confidence": 0.0,
    }

    # Step 1 — OCR: try Typhoon OCR first, then Azure CV
    raw_text, confidence = _call_typhoon_ocr(image_data)

    if not raw_text:
        logger.info("Typhoon OCR returned no text — falling back to Azure CV.")
        raw_text, confidence = _call_azure_cv(image_data)

    if not raw_text or confidence < CONFIDENCE_THRESHOLD:
        empty_result["confidence"] = confidence
        return empty_result

    # Step 2 — Parse with Typhoon LLM
    structured = _call_typhoon_llm(raw_text)
    structured["confidence"] = confidence
    return structured


# ---------------------------------------------------------------------------
# Typhoon OCR 1.5
# ---------------------------------------------------------------------------

def _call_typhoon_ocr(image_data: bytes) -> tuple:
    """Call Typhoon OCR 1.5 via the typhoon_ocr library.

    Returns:
        (raw_text: str, confidence: float)
        Typhoon OCR doesn't return per-word confidence, so we use 0.85
        as a reasonable default when text is returned successfully.
    """
    api_key = getattr(settings, "TYPHOON_API_KEY", "") or ""
    if not api_key:
        logger.warning("Typhoon API key not configured — skipping Typhoon OCR.")
        return ("", 0.0)

    try:
        import os
        os.environ["TYPHOON_OCR_API_KEY"] = api_key

        from typhoon_ocr import ocr_document

        # Write image to a temp file (typhoon_ocr needs a file path)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_data)
            tmp_path = tmp.name

        markdown = ocr_document(pdf_or_image_path=tmp_path)

        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

        if not markdown or not markdown.strip():
            return ("", 0.0)

        # Typhoon OCR doesn't give word-level confidence.
        # If we got text back, assume 0.85 confidence.
        return (markdown.strip(), 0.85)

    except ImportError:
        logger.warning("typhoon_ocr package not installed — skipping Typhoon OCR.")
        return ("", 0.0)
    except Exception as exc:
        logger.error("Typhoon OCR error: %s", exc)
        return ("", 0.0)


# ---------------------------------------------------------------------------
# Azure Computer Vision (fallback)
# ---------------------------------------------------------------------------

def _call_azure_cv(image_data: bytes, _retry: bool = True) -> tuple:
    """Call Azure Computer Vision Read API to extract text from an image.

    Returns:
        (raw_text: str, confidence: float)  — concatenated text lines and
        average word-level confidence.  On failure returns ("", 0.0).
    """
    endpoint = getattr(settings, "AZURE_CV_ENDPOINT", "") or ""
    api_key = getattr(settings, "AZURE_CV_KEY", "") or ""

    if not endpoint or not api_key:
        logger.warning("Azure CV credentials not configured.")
        return ("", 0.0)

    endpoint = endpoint.rstrip("/")
    read_url = f"{endpoint}/vision/v3.2/read/analyze"
    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "Content-Type": "application/octet-stream",
    }

    try:
        response = requests.post(read_url, headers=headers, data=image_data, timeout=30)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        if _retry:
            logger.info("Azure CV timeout — retrying once.")
            return _call_azure_cv(image_data, _retry=False)
        logger.error("Azure CV timeout after retry.")
        return ("", 0.0)
    except requests.exceptions.RequestException as exc:
        logger.error("Azure CV request failed: %s", exc)
        return ("", 0.0)

    operation_url = response.headers.get("Operation-Location")
    if not operation_url:
        logger.error("Azure CV response missing Operation-Location header.")
        return ("", 0.0)

    return _poll_azure_cv_result(operation_url, api_key)


def _poll_azure_cv_result(operation_url: str, api_key: str) -> tuple:
    """Poll Azure CV for the Read result until succeeded/failed."""
    headers = {"Ocp-Apim-Subscription-Key": api_key}

    for _ in range(_POLL_MAX_ATTEMPTS):
        time.sleep(_POLL_INTERVAL)
        try:
            resp = requests.get(operation_url, headers=headers, timeout=15)
            resp.raise_for_status()
            result = resp.json()
        except requests.exceptions.RequestException as exc:
            logger.error("Azure CV poll error: %s", exc)
            return ("", 0.0)

        status = result.get("status", "")
        if status == "succeeded":
            return _extract_text_from_read_result(result)
        if status in ("failed", "cancelled"):
            logger.error("Azure CV read operation %s.", status)
            return ("", 0.0)

    logger.error("Azure CV polling timed out after %d attempts.", _POLL_MAX_ATTEMPTS)
    return ("", 0.0)


def _extract_text_from_read_result(result: dict) -> tuple:
    """Extract concatenated text and average confidence from Azure CV result."""
    lines = []
    confidences = []

    for read_result in result.get("analyzeResult", {}).get("readResults", []):
        for line in read_result.get("lines", []):
            lines.append(line.get("text", ""))
            for word in line.get("words", []):
                conf = word.get("confidence", 0.0)
                confidences.append(conf)

    raw_text = "\n".join(lines)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    return (raw_text, avg_confidence)


# ---------------------------------------------------------------------------
# Typhoon LLM — parse raw OCR text into structured parcel data
# ---------------------------------------------------------------------------

_TYPHOON_SYSTEM_PROMPT = (
    "คุณเป็นระบบดึงข้อมูลจากใบปะหน้าพัสดุของไทย (parcel shipping label) "
    "ข้อความที่ได้มาจาก OCR จึงมี noise เยอะมาก เช่น barcode text, QR code, "
    "routing code, ลายมือเขียนทับ, ข้อความโฆษณาบนซอง, ชื่อสินค้า ฯลฯ\n\n"
    "## กฎสำคัญ\n"
    "1. **ผู้รับ (recipient_name)**: ดึงเฉพาะชื่อ-นามสกุลของผู้รับเท่านั้น "
    "มักอยู่หลังคำว่า 'ผู้รับ (TO)', 'Receiver', 'ผู้รับ' หรือ 'ชื่อผู้รับ' "
    "ห้ามใส่ที่อยู่ เบอร์โทร หรือข้อมูลอื่นปนมา\n"
    "2. **หมายเลขห้อง/บ้าน (unit_number)**: ดึงจากที่อยู่ผู้รับ "
    "มักเป็นเลขห้องคอนโด เช่น 'B 2608', '112/118', 'A5-1-1' "
    "หรืออยู่ในช่อง HOME/ROS บนใบ SPX/Shopee "
    "ถ้าเป็นบ้านเลขที่ให้ดึงเลขที่บ้านมา ไม่ต้องใส่ซอย/ถนน/ตำบล\n"
    "3. **บริษัทขนส่ง (courier)**: ดึงชื่อขนส่งหลัก เช่น "
    "'SPX Express' (Shopee), 'LEX' (Lazada), 'Flash Express', "
    "'Kerry Express', 'J&T Express', 'SMP Food', 'Thailand Post', "
    "'DHL', 'NIM Express', 'Best Express' "
    "มักอยู่ที่โลโก้หรือหัวใบปะหน้า\n"
    "4. **หมายเลขพัสดุ (tracking_number)**: ดึง tracking number หลัก "
    "เช่น 'TH263506730962V', 'LEXPU0672931350', '260401NGC22F84' "
    "มักเป็นรหัสยาวที่มีตัวอักษรปนตัวเลข อยู่ใกล้ barcode "
    "ห้ามดึง routing code สั้นๆ เช่น 'N_0_0_F10_AKLNG-A', 'H-KLL-A1', '90SB'\n\n"
    "## สิ่งที่ต้อง IGNORE\n"
    "- ลายมือเขียนด้วยปากกา (เช่น JP-2404, JP-2608, 2601)\n"
    "- Routing code / Sort code (เช่น AKLNG-A, H-KLL-A1, N_0_0_F10)\n"
    "- ข้อมูลผู้ส่ง (FROM) — เราต้องการเฉพาะผู้รับ (TO)\n"
    "- ชื่อสินค้า รายละเอียดสินค้า ราคา จำนวน\n"
    "- ข้อความโฆษณาบนซองพัสดุ\n"
    "- เลข Order / คำสั่งซื้อ (เช่น Shopee Order No)\n"
    "- PICKUP DATE, SHIP BY DATE\n\n"
    "ตอบเป็น JSON เท่านั้น ไม่ต้องอธิบาย:\n"
    '{"recipient_name": "...", "unit_number": "...", "courier": "...", "tracking_number": "..."}\n'
    "ถ้าไม่พบข้อมูลฟิลด์ไหนให้ใส่ค่าว่าง"
)


def _call_typhoon_llm(raw_text: str) -> dict:
    """Call Typhoon LLM to parse raw OCR text into structured parcel data.

    Returns:
        dict with keys: recipient_name, unit_number, courier, tracking_number.
        On failure, falls back to returning raw_text as recipient_name.
    """
    api_key = getattr(settings, "TYPHOON_API_KEY", "") or ""
    if not api_key:
        logger.warning("Typhoon API key not configured — using fallback.")
        return _typhoon_fallback(raw_text)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": _TYPHOON_LLM_MODEL,
        "messages": [
            {"role": "system", "content": _TYPHOON_SYSTEM_PROMPT},
            {"role": "user", "content": raw_text},
        ],
        "max_tokens": 512,
        "temperature": 0.1,
    }

    try:
        resp = requests.post(
            _TYPHOON_CHAT_URL, headers=headers, json=payload, timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return _parse_typhoon_response(content)
    except Exception as exc:
        logger.error("Typhoon LLM error: %s — using fallback.", exc)
        return _typhoon_fallback(raw_text)


def _parse_typhoon_response(content: str) -> dict:
    """Parse the JSON string returned by Typhoon into a dict."""
    cleaned = content.strip()
    # Strip markdown code fences if present
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Failed to parse Typhoon response as JSON: %s", content)
        return {
            "recipient_name": "",
            "unit_number": "",
            "courier": "",
            "tracking_number": "",
        }

    return {
        "recipient_name": str(parsed.get("recipient_name", "")),
        "unit_number": str(parsed.get("unit_number", "")),
        "courier": str(parsed.get("courier", "")),
        "tracking_number": str(parsed.get("tracking_number", "")),
    }


def _typhoon_fallback(raw_text: str) -> dict:
    """Fallback when Typhoon LLM is unavailable — return raw text as recipient_name."""
    return {
        "recipient_name": raw_text.strip()[:255],
        "unit_number": "",
        "courier": "",
        "tracking_number": "",
    }
