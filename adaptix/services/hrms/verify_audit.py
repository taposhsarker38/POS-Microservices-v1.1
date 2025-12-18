import os
import django
import sys
from unittest.mock import MagicMock

# Setup Django
sys.path.append('/app')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from config.middleware import AuditMiddleware

def verify_audit_logging():
    print("🚀 Verifying HRMS Audit Logging (Middleware)...")
    
    # 1. Setup Mock Request and Response
    request = MagicMock()
    request.method = 'POST'
    request.path = '/api/hrms/test/'
    request.user_claims = {'sub': 'user-123'}
    request.company_uuid = 'company-456'
    
    response = MagicMock()
    response.status_code = 201

    get_response = MagicMock(return_value=response)
    
    # 2. Initialize Middleware
    middleware = AuditMiddleware(get_response)
    
    # 3. Trigger Middleware Call (Should trigger publish_event)
    try:
        print("Trigggering middleware...")
        middleware(request)
        print("✅ Middleware executed without crashing.")
    except Exception as e:
        print(f"❌ Middleware failed: {e}")
        return

    # 4. Verify Side Effect? 
    # Since we are running this "live" against valid code, 
    # if `publish_event` fails (e.g. no RabbitMQ), it prints error to stdout.
    # If it works, it prints "Published event: ..."
    
    print("Note: Check output above for 'Published event: hrms.audit.post' or 'AUDIT SENT'.")

if __name__ == "__main__":
    verify_audit_logging()
