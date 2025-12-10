import jwt
from django.conf import settings

# Load Public Key
def _load_pub():
    path = getattr(settings, "PUBLIC_KEY_PATH", "/keys/public.pem")
    try:
        with open(path, "r") as f:
            return f.read()
    except Exception:
        return None

PUBLIC_KEY = _load_pub()
JWT_ALGO = getattr(settings, "JWT_ALGORITHM", "RS256")

class JWTCompanyMiddleware:
    """
    Decodes JWT token from Authorization header.
    Sets request.user_claims and request.company_uuid.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        header_uuid = request.headers.get("X-Company-UUID")
        if header_uuid:
             request.company_uuid = header_uuid
             request.user_claims = {"company_uuid": header_uuid, "permissions": []}
             return self.get_response(request)

        request.company_uuid = None
        request.user_claims = {}

        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
            if PUBLIC_KEY:
                try:
                    decoded = jwt.decode(
                        token,
                        PUBLIC_KEY,
                        algorithms=[JWT_ALGO],
                        audience=getattr(settings, "JWT_AUDIENCE", None),
                    )
                    request.user_claims = decoded
                    request.company_uuid = decoded.get("company_uuid") or decoded.get("company")
                except jwt.PyJWTError as e:
                    # In a real scenario, could log this
                    pass
        
        return self.get_response(request)
