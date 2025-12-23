import jwt
import os
from django.http import JsonResponse
from django.conf import settings
from .messaging import publish_event

class JWTCompanyMiddleware:
    """
    Middleware to validate JWT tokens and inject company context.
    
    Extracts from JWT:
    - company_uuid: For multi-tenancy filtering
    - user_claims: Full token payload for permission checks
    """
    
    # Paths that don't require authentication
    EXEMPT_PATHS = [
        '/admin/',
        '/api/docs/',
        '/api/schema/',
        '/api/redoc/',
        '/health/',
        '/favicon.ico',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self._public_key = None
    
    @property
    def public_key(self):
        """Lazy-load the public key."""
        if self._public_key is None:
            key_path = getattr(settings, 'PUBLIC_KEY_PATH', '/keys/public.pem')
            try:
                with open(key_path, 'r') as f:
                    self._public_key = f.read()
            except FileNotFoundError:
                print(f"Warning: Public key not found at {key_path}")
                self._public_key = ''
        return self._public_key
    
    def __call__(self, request):
        # Allow header override for testing if configured
        # header_uuid = request.headers.get("X-Company-UUID")
        # if header_uuid and settings.DEBUG:
        #      request.company_uuid = header_uuid
        #      request.user_claims = {"company_uuid": header_uuid, "permissions": []} 
        #      return self.get_response(request)

        # Skip exempt paths and OPTIONS requests
        if request.method == 'OPTIONS' or self._is_exempt(request.path):
            return self.get_response(request)
        
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            # No token provided - let DRF handle permission
            request.company_uuid = None
            request.user_claims = {}
            return self.get_response(request)
        
        token = auth_header.split(' ')[1]
        
        try:
            # Decode and validate token
            payload = jwt.decode(
                token,
                self.public_key,
                algorithms=[getattr(settings, 'JWT_ALGORITHM', 'RS256')],
                issuer=getattr(settings, 'JWT_ISSUER', 'auth-service'),
                audience=getattr(settings, 'JWT_AUDIENCE', 'pos-system'),
                options={"verify_aud": False} # Loose verify for now to support diverse services
            )
            
            # Inject into request
            token_company = payload.get('company_uuid') or payload.get('company')
            # Allow header override if token has no company (e.g. Superuser)
            # This enables Admin to act on behalf of any company
            header_company = request.headers.get("X-Company-UUID")
            
            request.company_uuid = token_company or header_company
            request.user_claims = payload
            
        except jwt.ExpiredSignatureError:
            print(f"JWT Middleware: Token Expired. Headers: {auth_header[:20]}...")
            return JsonResponse({'error': 'Token expired'}, status=401)
        except jwt.InvalidTokenError as e:
            print(f"JWT Middleware: Invalid Token. Error: {e}")
            try:
                # Debug payload
                unverified = jwt.decode(token, options={"verify_signature": False})
                print(f"Unverified Payload: {unverified}")
            except:
                pass
            return JsonResponse({'error': f'Invalid token: {str(e)}'}, status=401)
        except Exception as e:
            # Log but don't block - let view handle auth
            print(f"JWT Middleware Generic Error: {e}")
            request.company_uuid = None
            request.user_claims = {}
        
        return self.get_response(request)
    
    def _is_exempt(self, path):
        """Check if path is exempt from authentication."""
        return any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS)


class AuditMiddleware:
    """
    Middleware to log all modifying requests for audit trail.
    Publishes to RabbitMQ for async processing.
    """
    
    AUDIT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Only audit modifying requests
        if request.method in self.AUDIT_METHODS:
            self._log_audit(request, response)
        
        return response
    
    def _log_audit(self, request, response):
        """Log audit event with enhanced metadata."""
        try:
            claims = getattr(request, 'user_claims', {})
            
            # Extract client info
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')

            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            audit_data = {
                'user_id': claims.get('sub') or claims.get('user_id'),
                'username': claims.get('username'),
                'company_uuid': getattr(request, 'company_uuid', None),
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'ip_address': ip,
                'user_agent': user_agent,
                'service_name': os.environ.get('SERVICE_NAME', 'unknown'),
                'payload_preview': None,
            }
            
            # Safe body extraction
            try:
                if hasattr(request, '_body'):
                    import json
                    body_str = request._body.decode('utf-8')
                    if body_str:
                       audit_data['payload_preview'] = json.loads(body_str)
            except Exception:
                pass

            import threading
            routing_key = f"audit.{request.method.lower()}"
            # Publish in a separate thread to avoid blocking the main request
            threading.Thread(
                target=publish_event, 
                args=('audit_logs', routing_key, audit_data),
                daemon=True
            ).start()
            
            if response.status_code < 400:
                print(f"[Core] AUDIT QUEUED from {ip}: {request.method} {request.path}")
        except Exception as e:
            print(f"Audit logging failed: {e}")
import uuid
from .logging import set_correlation_id

class CorrelationIDMiddleware:
    """
    Middleware to extract or generate correlation ID and store in thread-local.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        correlation_id = request.headers.get('X-Correlation-ID') or request.headers.get('X-Request-ID')
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        
        set_correlation_id(correlation_id)
        
        response = self.get_response(request)
        
        # Return ID in response headers for tracing
        response['X-Correlation-ID'] = correlation_id
        return response
