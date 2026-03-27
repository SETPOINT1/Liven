"""
OCR Pipeline Service — Azure Computer Vision + Typhoon API.

Reads parcel label images using Azure CV, then uses Typhoon to parse
Thai text into structured fields (recipient_name, unit_number, courier,
tracking_number).

Requirements: 9.1, 9.2, 9.4, 9.5
"""
import json
import logging
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Confidence threshold: >= 60% returns data, < 60% returns empty form
CONFIDENCE_THRESHOLD = 0.60

# Azure CV polling settings
_POLL_INTERVAL = 1  # seconds
_POLL_MAX_ATTEMPTS = 30


def scan_parcel_image(image_data: bytes) -> dict:
    """Main entry point — scan a parcel label image and return structured data.

    Args:
        image_data: Raw image bytes (JPEG/PNG).

    Returns:
        dict with keys: recipient_name, unit_number, courier,
        tracking_number, confidence.
        If confidence < 60 %, all text fields are empty strings.
    """
    empty_result = {
        "recipient_name": "",
        "unit_number": "",
        "courier": "",
        "tracking_number": "",
        "confidence": 0.0,
    }

    # Step 1 — Azure Computer Vision OCR
    raw_text, confidence = _call_azure_cv(image_data)

    if not raw_text or confidence < CONFIDENCE_THRESHOLD:
        empty_result["confidence"] = confidence
        return empty_result

    # Step 2 — Typhoon Thai text parsing
    structured = _call_typhoon(raw_text)

    structured["confidence"] = confidence
    return structured


def _call_azure_cv(image_data: bytes, _retry: bool = True) -> tuple:
    """Call Azure Computer Vision Read API to extract text from an image.

    Returns:
        (raw_text: str, confidence: float)  — concatenated text lines and
        average word-level confidence.  On failure returns ("", 0.0).
    """
    endpoint = settings.AZURE_CV_ENDPOINT.rstrip("/")
    api_key = settings.AZURE_CV_KEY

    if not endpoint or not api_key:
        logger.warning("Azure CV credentials not configured.")
        return ("", 0.0)

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

    # The Read API is async — poll the operation-location for the result.
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
        # status is "running" or "notStarted" — keep polling

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


def _call_typhoon(raw_text: str) -> dict:
    """Call Typhoon API to parse raw OCR Thai text into structured parcel data.

    Returns:
        dict with keys: recipient_name, unit_number, courier, tracking_number.
        On failure, falls back to returning raw_text as recipient_name.
    """
    api_key = settings.TYPHOON_API_KEY
    if not api_key:
        logger.warning("Typhoon API key not configured — using fallback.")
        return _typhoon_fallback(raw_text)

    typhoon_url = "https://api.opentyphoon.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    system_prompt = (
        "คุณเป็นระบบจัดรูปแบบข้อมูลพัสดุ จากข้อความ OCR ที่ได้จากใบปะหน้าพัสดุ "
        "ให้ดึงข้อมูลต่อไปนี้ออกมาเป็น JSON:\n"
        '- recipient_name: ชื่อผู้รับ\n'
        '- unit_number: หมายเลขห้อง/บ้าน\n'
        '- courier: บริษัทขนส่ง\n'
        '- tracking_number: หมายเลขพัสดุ/tracking\n\n'
        "ตอบเป็น JSON เท่านั้น ไม่ต้องอธิบายเพิ่มเติม ถ้าไม่พบข้อมูลให้ใส่ค่าว่าง"
    )

    payload = {
        "model": "typhoon-v1.5-instruct",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": raw_text},
        ],
        "max_tokens": 256,
        "temperature": 0.1,
    }

    try:
        resp = requests.post(typhoon_url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return _parse_typhoon_response(content)
    except Exception as exc:
        logger.error("Typhoon API error: %s — using fallback.", exc)
        return _typhoon_fallback(raw_text)


def _parse_typhoon_response(content: str) -> dict:
    """Parse the JSON string returned by Typhoon into a dict."""
    # Strip markdown code fences if present
    cleaned = content.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (```json or ```)
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
    """Fallback when Typhoon is unavailable — return raw text as recipient_name."""
    return {
        "recipient_name": raw_text.strip(),
        "unit_number": "",
        "courier": "",
        "tracking_number": "",
    }
