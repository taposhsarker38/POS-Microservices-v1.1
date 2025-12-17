import jwt
from django.http import JsonResponse
from django.conf import settings

class JWTUser:
    def __init__(self, payload):
        self.payload = payload
        self.is_authenticated = True
        self.pk = payload.get('user_id') or payload.get('sub')
        self.id = self.pk
        self.username = payload.get('email') or payload.get('username') or 'jwt_user'

class JWTCompanyMiddleware:
    """
    Middleware to validate JWT tokens and extract user info.
    Same as other services.
    """
    
    EXEMPT_PATHS = [
        '/admin/',
        '/api/docs/',
        '/api/schema/',
        '/health/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self._public_key = None
    
    @property
    def public_key(self):
        if self._public_key is None:
            key_path = os.environ.get('PUBLIC_KEY_PATH', '/keys/public.pem')
            try:
                with open(key_path, 'r') as f:
                    self._public_key = f.read()
            except FileNotFoundError:
                print(f"Warning: Public key not found at {key_path}")
                self._public_key = ''
        return self._public_key
    
    def __call__(self, request):
        if self._is_exempt(request.path):
            return self.get_response(request)
        
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            request.company_uuid = None
            request.user_claims = {}
            return self.get_response(request)
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(
                token,
                self.public_key,
                algorithms=['RS256'], # Assuming RS256 for now, can come from settings
                audience=os.environ.get('JWT_AUDIENCE', 'pos-system'),
                issuer=os.environ.get('JWT_ISSUER', 'auth-service'),
            )
            
            request.company_uuid = payload.get('company_uuid')
            # Extract user_id from 'sub' or 'user_id'
            user_id = payload.get('user_id') or payload.get('sub')
            payload['user_id'] = user_id # normalize
            request.user_claims = payload
            
            # Set request.user so IsAuthenticated works
            request.user = JWTUser(payload)
            
            
        except jwt.ExpiredSignatureError:
            return JsonResponse({'error': 'Token expired'}, status=401)
        except jwt.InvalidTokenError as e:
            return JsonResponse({'error': f'Invalid token: {str(e)}'}, status=401)
        except Exception as e:
            print(f"JWT Middleware Error: {e}")
            request.company_uuid = None
            request.user_claims = {}
        
        return self.get_response(request)
    
    def _is_exempt(self, path):
        return any(path.startswith(exempt) for exempt in self.EXEMPT_PATHS)

import os
