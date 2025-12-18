import os
import django
import sys
from decimal import Decimal
from unittest.mock import MagicMock

# Setup Django
sys.path.append('/app')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.sales.serializers import OrderSerializer
from apps.sales.models import Order, OrderItem, Payment

def verify_context_passing():
    print("🚀 Verifying POS Context Passing...")
    
    # 1. Setup Test Data & Context
    company_uuid = '00000000-0000-0000-0000-000000000005'
    user_id = 'user-abc'
    
    data = {
        'items': [
            {'product_uuid': '00000000-0000-0000-0000-000000000001', 'product_name': 'Test Prod', 'quantity': 2, 'unit_price': 100},
        ],
        'payment_data': [
            {'method': 'cash', 'amount': 200}
        ],
        'company_uuid': company_uuid,
        'created_by': user_id
    }
    
    # 2. Serialize and Validate
    serializer = OrderSerializer(data=data)
    if not serializer.is_valid():
        print(f"❌ Serializer Invalid: {serializer.errors}")
        return

    # 3. Save (This calls our modified create method)
    try:
        # Note: In a real view, perform_create calls save(company_uuid=..., created_by=...)
        # But serializers don't automatically use kwargs in create(), they use validated_data.
        # So we passed them in data above, or we pass them in save().
        # Let's verify how it behaves if passed via save() kwargs implies extracting them and adding to validated_data?
        # NO. standard behavior: serializer.save(foo=bar) -> serializer.validated_data['foo'] = bar (before create is called)
        
        order = serializer.save(company_uuid=company_uuid, created_by=user_id)
        print(f"✅ Order Created: {order.order_number}")
    except Exception as e:
        print(f"❌ Save failed: {e}")
        import traceback
        traceback.print_exc()
        return

    # 4. Verify Context Propagation
    
    # Check Order
    if str(order.company_uuid) == company_uuid and order.created_by == user_id:
        print("✅ Order Context Correct")
    else:
        print(f"❌ Order Context Mismatch: {order.company_uuid}, {order.created_by}")

    # Check Items
    item = OrderItem.objects.filter(order=order).first()
    if str(item.company_uuid) == company_uuid: # Assuming items have company_uuid field?
        # NOTE: Model check - do OrderItems actually have company_uuid? 
        # Ideally yes for partitioning, but let's check if it didn't crash.
        print(f"✅ OrderItem Context Correct (or at least saved): {item.company_uuid}")
    else:
        print(f"❌ OrderItem Context Mismatch: {item.company_uuid}")

    # Check Payments
    payment = Payment.objects.filter(order=order).first()
    if str(payment.company_uuid) == company_uuid and payment.created_by == user_id:
        print("✅ Payment Context Correct")
    else:
        print(f"❌ Payment Context Mismatch: {payment.company_uuid}, {payment.created_by}")

if __name__ == "__main__":
    verify_context_passing()
