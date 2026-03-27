from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """Custom exception handler that formats errors as:
    {
        "error": {
            "code": "ERROR_CODE",
            "message": "Human-readable message",
            "details": { ... }
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        # Map HTTP status codes to error codes
        code_map = {
            400: 'VALIDATION_ERROR',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            405: 'METHOD_NOT_ALLOWED',
            429: 'THROTTLED',
            500: 'INTERNAL_ERROR',
        }
        error_code = code_map.get(response.status_code, 'ERROR')

        # If the response already has our error format, pass through
        if isinstance(response.data, dict) and 'error' in response.data:
            return response

        # Build standardised error body
        details = response.data if isinstance(response.data, dict) else {}
        message = 'เกิดข้อผิดพลาด'

        if isinstance(response.data, dict) and 'detail' in response.data:
            message = str(response.data['detail'])
            details = {}
        elif isinstance(response.data, list):
            message = str(response.data[0]) if response.data else message
            details = {}

        response.data = {
            'error': {
                'code': error_code,
                'message': message,
                'details': details,
            }
        }

    return response
