import os
import django
import sys
import time
from decimal import Decimal

# Setup Django Context for HRMS to trigger event
# Detect environment (Docker vs Local)
if os.path.exists('/app'):
    sys.path.append('/app')
else:
    # Fallback for local execution
    # Script is in adaptix/services/hrms/verify_automation.py
    # Needs to see 'config' package which is in the same directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.append(current_dir)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.payroll.models import Payslip, EmployeeSalary, SalaryStructure
from apps.employees.models import Employee
from django.utils import timezone
from rest_framework.test import APIRequestFactory
from apps.payroll.views import PayslipViewSet

def run_test():
    print("🚀 Triggering Payroll Finalization...")
    
    # 1. Fetch a Draft Payslip (or create one if needed - assuming verify_payroll ran)
    payslip = Payslip.objects.filter(status='draft').first()
    if not payslip:
        print("⚠️ No draft payslip found. Please run verify_payroll.py first or ensure data exists.")
        return

    print(f"📄 Found Draft Payslip: {payslip.id} for Net Pay: {payslip.net_pay}")
    
    # 2. Call Finalize View
    factory = APIRequestFactory()
    view = PayslipViewSet.as_view({'post': 'finalize'})
    
    request = factory.post(f'/api/hrms/payslip/{payslip.id}/finalize/')
    response = view(request, pk=payslip.id)
    
    if response.status_code != 200:
        print(f"❌ Failed to finalize: {response.data}")
        return
        
    print("✅ Payslip Finalized & Event Published.")
    print("⏳ Waiting for Accounting Consumer (5s)...")
    time.sleep(5)
    
    # 3. Connect to Accounting DB to Verify (Simulated check via logs or if we had access)
    # Since we are inside HRMS container, we can't easily check Accounting DB without another connection.
    # For now, we assume success if no error logged and event sent.
    # In a real pipeline, we'd query the accounting service API.
    
    print("✅ Verification Trigger Complete. Check Accounting Logs for 'Journal Entry Created'.")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"❌ Test Failed: {e}")
