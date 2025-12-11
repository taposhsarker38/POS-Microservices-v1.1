import jwt
import os
from django.conf import settings
from django.http import JsonResponse

class JWTCompanyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        header_uuid = request.headers.get("X-Company-UUID")
        auth_header = request.headers.get("Authorization")
        
        request.company_uuid = header_uuid
        request.user_claims = {}

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Load Public Key
                with open(settings.PUBLIC_KEY_PATH, 'rb') as f:
                    public_key = f.read()
                
                payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=[settings.JWT_ALGORITHM],
                    audience=settings.JWT_AUDIENCE,
                    issuer=settings.JWT_ISSUER
                )
                request.user_claims = payload
                
                # If no header UUID, try to get from claims (fail-safe)
                if not header_uuid and "company_uuid" in payload:
                    request.company_uuid = payload["company_uuid"]

            except jwt.ExpiredSignatureError:
                print("JWT Error: Expired")
                return JsonResponse({"detail": "Token expired"}, status=401)
            except jwt.InvalidTokenError as e:
                print(f"JWT InvalidTokenError: {str(e)}")
                # Print key details
                try:
                    print(f"Public Key Path: {settings.PUBLIC_KEY_PATH}")
                    with open(settings.PUBLIC_KEY_PATH, 'rb') as f:
                        k = f.read().decode()
                        print(f"Key loaded: {k[:20]}...")
                except Exception as ke:
                    print(f"Key load error: {ke}")
                return JsonResponse({"detail": f"Invalid token: {str(e)}"}, status=401)
            except Exception as e:
                print(f"JWT Error: {e}")
                import traceback
                traceback.print_exc()
                return JsonResponse({"detail": "Authentication failed"}, status=401)

        response = self.get_response(request)
        return response
