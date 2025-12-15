import jwt
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status as http_status
from django.core import signing
from django.core.mail import send_mail
from django.urls import reverse
import uuid
EMAIL_CONFIRM_SALT = getattr(settings, "EMAIL_CONFIRM_SALT", "email-confirm-salt")
EMAIL_CONFIRM_EXP_SECONDS = getattr(settings, "EMAIL_CONFIRM_EXP_SECONDS", 60 * 60 * 24)  # 24h

def generate_email_token(user):
    """Return a signed token for email verification (contains user_id)."""
    payload = {"user_id": str(user.id)}
    return signing.dumps(payload, salt=EMAIL_CONFIRM_SALT)

def verify_email_token(token, max_age=EMAIL_CONFIRM_EXP_SECONDS):
    """Return payload dict if token valid, else None."""
    try:
        return signing.loads(token, salt=EMAIL_CONFIRM_SALT, max_age=max_age)
    except Exception:
        return None

def send_verification_email(user, request):
    # create token
    token = uuid.uuid4().hex
    user.verify_email_token = token
    user.save(update_fields=["verify_email_token"])

    # build verification link
    base_url = getattr(settings, "FRONTEND_URL", None) or f"{request.scheme}://{request.get_host()}"
    
    # Use frontend route for verification
    verify_path = f"/verify-email?token={token}"
    verify_url = f"{base_url.rstrip('/')}{verify_path}"

    subject = "Verify your email"
    message = f"Click the link below to verify your email:\n\n{verify_url}"

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False
    )


def create_rs256_token(user):
    private_key = open('/run/secrets/jwt_private.pem').read()  # mount in container
    payload = {"user_id": user.id, "username": user.username, "exp": datetime.utcnow() + timedelta(minutes=60)}
    token = jwt.encode(payload, private_key, algorithm="RS256")
    return token

def api_response(data=None, message="", errors=None, success=True, status_code=http_status.HTTP_200_OK):
    envelope = {
        "status": "success" if success else "error",
        "code": status_code,
        "message": message,
        "data": data or {},
        "errors": errors or {}
    }
    return Response(envelope, status=status_code)

