import sys
import os
import django

def verify_setup():
    print("Verifying Logistics Service Setup...")
    try:
        # Detect environment and setup path
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Assuming structure: .../adaptix/services/logistics/verify_logistics.py
        # We need to add .../POS-Microservices-v1.1 (or root of project) to path if not present
        # In docker, /app is root. Locally coverage might vary. 
        # Strategy: Go up 3 levels from 'services/logistics' to reach 'adaptix' parent or 'adaptix' itself?
        # Actually 'config.settings' implies 'adaptix' folder is on path or inside it.
        # Let's try to resolve based on known 'config' dir location relative to this script.
        
        # This script is in: adaptix/services/logistics/verify_logistics.py
        # Config is in: adaptix/services/logistics/config/settings.py -> Wait, no.
        # The import is "os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')"
        # This implies 'config' is a python package reachable from sys.path.
        # In this service, we see 'config' dir in 'adaptix/services/logistics/config'.
        
        # So we need 'adaptix/services/logistics' to be in sys.path? 
        # OR if 'config.settings' refers to the service's own config.
        # Let's check where 'config' folder is. 
        # From `list_dir` of logistics: {"name":"config","isDir":true}
        # So verifying script needs the directory CONTAINING 'config' to be in sys.path.
        # That directory is 'adaptix/services/logistics' (where this script is).
        
        if current_dir not in sys.path:
            sys.path.append(current_dir)

        from django.conf import settings
        if not settings.configured:
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
            django.setup()
        
        print("✅ Django configured")
        
        from apps.shipping.models import Vehicle, Shipment, DeliveryRoute
        print("✅ Models imported successfully")
        
        print("✅ Logistics Service verification complete!")
        return True
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

if __name__ == "__main__":
    if verify_setup():
        sys.exit(0)
    else:
        sys.exit(1)
