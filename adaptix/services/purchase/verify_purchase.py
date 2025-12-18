import sys
import os
import django

def verify_setup():
    print("Verifying Purchase Service Setup...")
    try:
        from django.conf import settings
        if not settings.configured:
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
            django.setup()
        
        print("✅ Django configured")
        
        from apps.vendors.models import Vendor
        from apps.procurement.models import PurchaseOrder
        print("✅ Models imported successfully")
        
        print("✅ Purchase Service verification complete!")
        return True
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

if __name__ == "__main__":
    if verify_setup():
        sys.exit(0)
    else:
        sys.exit(1)
