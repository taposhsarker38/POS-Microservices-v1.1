import os
import django
import sys
import uuid

# Setup Django
sys.path.append('/app')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.automation.models import AutomationRule, ActionLog
from apps.automation.services import RuleEngine

def verify_rule_execution():
    print("🚀 Verifying Automation Rule Engine...")
    
    # 1. Create a Test Rule
    rule_name = f"Test Rule {uuid.uuid4()}"
    rule = AutomationRule.objects.create(
        name=rule_name,
        trigger_type="stock_level",
        condition_field="quantity",
        condition_operator="<",
        condition_value="10",
        action_type="log",
        action_config={"message": "Stock low!"}
    )
    print(f"✅ Created Rule: {rule}")
    
    # 2. Evaluate with Context that should MATCH
    context_match = {"quantity": 5, "product_id": "123"}
    print(f"Testing MATCH with context: {context_match}")
    results = RuleEngine.evaluate("stock_level", context_match)
    
    if len(results) > 0 and results[0]['status'] == 'success':
        print("✅ Rule Triggered Successfully!")
        log = ActionLog.objects.get(id=results[0]['log_id'])
        print(f"📄 Log Created: {log.details}")
    else:
        print(f"❌ Match Failed. Results: {results}")
        
    # 3. Evaluate with Context that should NOT MATCH
    context_no_match = {"quantity": 15, "product_id": "123"}
    print(f"Testing NO MATCH with context: {context_no_match}")
    results_fail = RuleEngine.evaluate("stock_level", context_no_match)
    
    if len(results_fail) == 0:
        print("✅ Rule Correctly Ignored.")
    else:
        print(f"❌ Logic Error. Should have ignored but got: {results_fail}")

    # Cleanup
    rule.delete()
    print("✅ Cleanup complete.")

if __name__ == "__main__":
    verify_rule_execution()
