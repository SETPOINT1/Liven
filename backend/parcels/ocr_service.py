"""
OCR Pipeline Service — Azure CV + Typhoon LLM.

Pipeline:
    1. Azure Computer Vision → read raw text from parcel label image
    2. Typhoon LLM (chat completion) → extract structured JSON from raw text
    3. Fallback: Typhoon OCR endpoint if Azure fails

Requirements: 9.1, 9.2, 9.4, 9.5
"""
import base64
import json
import logging
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.60

_POLL_INTERVAL = 1
_POLL_MAX_ATTEMPTS = 30

_TYPHOON_OCR_URL = "https://api.opentyphoon.ai/v1/ocr"
_TYPHOON_CHAT_URL = "https://api.opentyphoon.ai/v1/chat/completions"
_TYPHOON_CHAT_MODEL = "typhoon-v2-70b-instruct"

_EXTRACT_PROMPT = """คุณเป็น AI ที่เชี่ยวชาญในการอ่านฉลากพัสดุ (parcel label) ภาษาไทยและอังกฤษ
จาก raw text ที่ได้จาก OCR ให้ extract ข้อมูลต่อไปนี้เป็น JSON:

- recipient_name: ชื่อผู้รับ (ดูจาก "ผู้รับ (TO)" หรือ "Receiver")
- unit_number: เลขห้อง/บ้านเลขที่ (เช่น 112/118, A101, B2608)
- courier: ชื่อบริษัทขนส่ง (เช่น SPX Express, LEX, Flash Express, Kerry, J&T, Shopee Express, Lazada)
- tracking_number: เลขพัสดุ/tracking (เช่น TH263506730962V, LEXPU0672931350)

ตอบเป็น JSON เท่านั้น ไม่ต้องอธิบาย ถ้าไม่พบข้อมูลให้ใส่ string ว่าง ""
ตัวอย่าง output:
{"recipient_name": "สมชาย ใจดี", "unit_number": "112/118", "courier": "SPX Express", "tracking_number": "TH263506730962V"}
"""


def scan_parcel_image(image_data: bytes) -> dict:
    """Scan a parcel label image and return structured data.

    Pipeline:
        1. Azure CV → raw text + confidence
        2. Typhoon LLM → structured extraction from raw text
        3. Fallback: Typhoon OCR if Azure fails
    """
    empty_result = {
        "recipient_name": "",
        "unit_number": "",
        "courier": "",
        "tracking_number": "",
        "confidence": 0.0,
    }

    # Step 1 — Azure CV: read raw text from image
    raw_text, confidence = _call_azure_cv(image_data)

    if not raw_text or confidence < CONFIDENCE_THRESHOLD:
        # Fallback: try Typhoon OCR endpoint
        logger.info("Azure CV returned low confidence (%.2f) — trying Typhoon OCR.", confidence)
        raw_text = _call_typhoon_ocr(image_data)
        if not raw_text:
            empty_result["confidence"] = confidence
            return empty_result
        confidence = 0.70  # default confidence for Typhoon OCR fallback

    # Step 2 — Typhoon LLM: extract structured data from raw text
    structured = _call_typhoon(raw_text)

    if structured:
        structured["confidence"] = confidence
        return structured

    # If Typhoon LLM fails, try basic parsing
    structured = _parse_parcel_text(raw_text)
    structured["confidence"] = confidence
    return structured


def _call_azure_cv(image_data: bytes) -> tuple:
    """Call Azure Computer Vision Read API to extract text.

    Returns (raw_text, confidence) tuple.
    """
    endpoint = getattr(settings, "AZURE_CV_ENDPOINT", "")
    key = getattr(settings, "AZURE_CV_KEY", "")

    if not endpoint or not key:
        logger.warning("Azure CV credentials not configured.")
        return ("", 0.0)

    # Submit read request
    read_url = f"{endpoint.rstrip('/')}/vision/v3.2/read/analyze"
    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/octet-stream",
    }

    try:
        response = requests.post(read_url, headers=headers, data=image_data, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error("Azure CV submit failed: %s", e)
        return ("", 0.0)

    # Get operation location for polling
    operation_url = response.headers.get("Operation-Location")
    if not operation_url:
        logger.error("Azure CV: no Operation-Location header.")
        return ("", 0.0)

    # Poll for results
    poll_headers = {"Ocp-Apim-Subscription-Key": key}
    for _ in range(_POLL_MAX_ATTEMPTS):
        time.sleep(_POLL_INTERVAL)
        try:
            poll_resp = requests.get(operation_url, headers=poll_headers, timeout=15)
            poll_resp.raise_for_status()
            result = poll_resp.json()
        except requests.RequestException as e:
            logger.error("Azure CV poll failed: %s", e)
            return ("", 0.0)

        status = result.get("status", "")
        if status == "succeeded":
            return _extract_azure_text(result)
        elif status == "failed":
            logger.error("Azure CV read failed: %s", result)
            return ("", 0.0)

    logger.error("Azure CV polling timed out.")
    return ("", 0.0)


def _extract_azure_text(result: dict) -> tuple:
    """Extract text and average confidence from Azure CV read result."""
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


def _call_typhoon_ocr(image_data: bytes) -> str:
    """Call Typhoon OCR endpoint as fallback. Returns raw text or empty string."""
    api_key = getattr(settings, "TYPHOON_API_KEY", "")
    if not api_key:
        logger.warning("Typhoon API key not configured.")
        return ""

    try:
        b64_image = base64.b64encode(image_data).decode("utf-8")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {"image": b64_image}

        response = requests.post(
            _TYPHOON_OCR_URL, headers=headers, json=payload, timeout=30
        )
        response.raise_for_status()
        data = response.json()
        return data.get("text", "")
    except requests.RequestException as e:
        logger.error("Typhoon OCR failed: %s", e)
        return ""


def _call_typhoon(raw_text: str) -> dict | None:
    """Call Typhoon LLM chat completion to extract structured parcel data.

    Returns dict with recipient_name, unit_number, courier, tracking_number
    or None if extraction fails.
    """
    api_key = getattr(settings, "TYPHOON_API_KEY", "")
    if not api_key:
        logger.warning("Typhoon API key not configured.")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": _TYPHOON_CHAT_MODEL,
        "messages": [
            {"role": "system", "content": _EXTRACT_PROMPT},
            {"role": "user", "content": f"Raw OCR text:\n{raw_text}"},
        ],
        "temperature": 0.0,
        "max_tokens": 512,
    }

    try:
        response = requests.post(
            _TYPHOON_CHAT_URL, headers=headers, json=payload, timeout=30
        )
        response.raise_for_status()
        data = response.json()

        content = data["choices"][0]["message"]["content"].strip()
        # Clean markdown code fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[-1]
            content = content.rsplit("```", 1)[0].strip()

        parsed = json.loads(content)
        return {
            "recipient_name": str(parsed.get("recipient_name", "")).strip()[:255],
            "unit_number": str(parsed.get("unit_number", "")).strip()[:50],
            "courier": str(parsed.get("courier", "")).strip()[:100],
            "tracking_number": str(parsed.get("tracking_number", "")).strip()[:100],
        }
    except (requests.RequestException, json.JSONDecodeError, KeyError, IndexError) as e:
        logger.error("Typhoon LLM extraction failed: %s", e)
        return None


def _parse_parcel_text(raw_text: str) -> dict:
    """Basic regex-based fallback parser for parcel label text.

    Used when Typhoon LLM is unavailable.
    """
    import re

    result = {
        "recipient_name": "",
        "unit_number": "",
        "courier": "",
        "tracking_number": "",
    }

    # Courier detection
    courier_patterns = {
        "SPX Express": r"SPX",
        "Kerry Express": r"Kerry",
        "Flash Express": r"Flash",
        "J&T Express": r"J&T|J\s*&\s*T",
        "Thailand Post": r"Thailand\s*Post|ไปรษณีย์",
        "DHL": r"DHL",
        "Ninja Van": r"Ninja\s*Van",
        "Shopee Express": r"Shopee",
        "Lazada Express": r"Lazada|LEX",
        "Best Express": r"Best\s*Express",
    }
    for courier_name, pattern in courier_patterns.items():
        if re.search(pattern, raw_text, re.IGNORECASE):
            result["courier"] = courier_name
            break

    # Tracking number: alphanumeric 10+ chars
    tracking_match = re.search(r"\b([A-Z]{2}\d{9,}[A-Z]{0,2})\b", raw_text)
    if not tracking_match:
        tracking_match = re.search(r"\b(\d{12,20}[A-Z]*\d*)\b", raw_text)
    if tracking_match:
        result["tracking_number"] = tracking_match.group(1)

    # Unit number patterns
    unit_match = re.search(r"\b(\d{1,4}/\d{1,4})\b", raw_text)
    if unit_match:
        result["unit_number"] = unit_match.group(1)

    # Recipient: line after ผู้รับ (TO)
    recipient_match = re.search(
        r"ผู้รับ\s*\(?TO\)?\s*[:\s]*(.+)", raw_text, re.IGNORECASE
    )
    if recipient_match:
        result["recipient_name"] = recipient_match.group(1).strip()[:255]

    return result
