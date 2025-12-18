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
        header_uuid = request.headers.get("X-Company-UUID")
        if header_uuid and settings.DEBUG:
             request.company_uuid = header_uuid
             request.user_claims = {"company_uuid": header_uuid, "permissions": []} 
             return self.get_response(request)

        # Skip exempt paths
        if self._is_exempt(request.path):
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
            request.company_uuid = payload.get('company_uuid') or payload.get('company')
            request.user_claims = payload
            
        except jwt.ExpiredSignatureError:
            return JsonResponse({'error': 'Token expired'}, status=401)
        except jwt.InvalidTokenError as e:
            return JsonResponse({'error': f'Invalid token: {str(e)}'}, status=401)
        except Exception as e:
            # Log but don't block - let view handle auth
            print(f"JWT Middleware Error: {e}")
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
        """Log audit event (can be extended to publish to RabbitMQ)."""
        try:
            claims = getattr(request, 'user_claims', {})
            audit_data = {
                'user_id': claims.get('sub') or claims.get('user_id'),
                'company_uuid': getattr(request, 'company_uuid', None),
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
            }
            
            # Publish to RabbitMQ using shared utility
            # Service name could be injected or inferred? For now allow generic 'audit'
            routing_key = f"audit.{request.method.lower()}"
            publish_event('audit_logs', routing_key, audit_data)
            
            if response.status_code < 400:
                print(f"[Core] AUDIT SENT: {audit_data}")
        except Exception as e:
            print(f"Audit logging failed: {e}")
