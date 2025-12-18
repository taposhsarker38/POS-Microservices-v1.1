import sys
import os
import django

def verify_setup():
    print("Verifying Reporting Service Setup...")
    try:
        from django.conf import settings
        if not settings.configured:
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
            django.setup()
        
        print("✅ Django configured")
        
        from apps.analytics.models import DailySales, Transaction
        print("✅ Models imported successfully")
        
        print("✅ Reporting Service verification complete!")
        return True
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

if __name__ == "__main__":
    if verify_setup():
        sys.exit(0)
    else:
        sys.exit(1)
