import os, jwt
from django.conf import settings

PUB_KEY_PATH = settings.PUBLIC_KEY_PATH if hasattr(settings, "PUBLIC_KEY_PATH") else "/keys/public.pem"
JWT_ALGO = "RS256"

def _load_pub():
    try:
        with open(PUB_KEY_PATH, "r") as f:
            return f.read()
    except Exception:
        return None

PUBLIC_KEY = _load_pub()

class JWTCompanyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # PUBLIC_KEY already loaded at module import

    def __call__(self, request):
        # allow explicit header for testing/dev: X-Company-UUID
        header_uuid = request.headers.get("X-Company-UUID") or request.headers.get("X-Company-Id") or request.headers.get("X-Company-Id".lower())
        if header_uuid:
            request.company_uuid = header_uuid
            request.user_claims = {"company_uuid": header_uuid, "test_via_header": True}
            return self.get_response(request)

        # default: try to decode Bearer token using public key
        request.company_uuid = None
        request.user_claims = None
        auth = request.headers.get("Authorization","")
        if auth and auth.startswith("Bearer "):
            token = auth.split(" ",1)[1].strip()
            if PUBLIC_KEY:
                try:
                    decoded = jwt.decode(
                        token,
                        PUBLIC_KEY,
                        algorithms=[JWT_ALGO],
                        issuer=getattr(settings, "JWT_ISSUER", None),
                        audience=getattr(settings, "JWT_AUDIENCE", None),
                    )
                    request.user_claims = decoded
                    # support both claim names
                    request.company_uuid = decoded.get("company_uuid") or decoded.get("company_id") or decoded.get("company")
                except jwt.PyJWTError:
                    request.user_claims = None
                    request.company_uuid = None
        return self.get_response(request)



