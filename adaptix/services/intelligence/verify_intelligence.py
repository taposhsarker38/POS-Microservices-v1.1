import sys
import os
import django

def verify_setup():
    print("Verifying Intelligence Service Setup...")
    try:
        from django.conf import settings
        if not settings.configured:
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
            django.setup()
        
        print("✅ Django configured")
        
        from apps.automation.models import AutomationRule
        from apps.crm_opt.models import CustomerSegmentation
        from apps.forecasts.models import SalesForecast
        from apps.inventory_opt.models import InventoryOptimization
        print("✅ Models imported successfully")
        
        print("✅ Intelligence Service verification complete!")
        return True
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

if __name__ == "__main__":
    if verify_setup():
        sys.exit(0)
    else:
        sys.exit(1)
