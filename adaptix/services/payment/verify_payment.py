
import os
import django
from decimal import Decimal
import sys
import uuid

# Setup Django Environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.payments.models import Payment, Transaction

def verify_payment_flow():
    order_id = uuid.uuid4()
    print(f"🔹 Starting Payment Verification for Order: {order_id}")

    # 1. Create Payment (Pending)
    payment = Payment.objects.create(
        order_id=order_id,
        amount=Decimal("150.00"),
        currency="USD",
        status="pending",
        method="card"
    )
    print(f"✅ Created Payment: {payment.amount} {payment.currency} (Status: {payment.status})")

    # 2. Simulate Gateway Transaction (Success)
    transaction = Transaction.objects.create(
        payment=payment,
        status="succeeded",
        gateway_response={"id": "ch_12345", "outcome": "approved"}
    )
    print(f"✅ Created Transaction Log: {transaction.status}")
    
    # 3. Update Payment Status
    payment.status = "completed"
    payment.stripe_charge_id = "ch_12345"
    payment.save()
    
    # 4. Verify Final State
    refetched_payment = Payment.objects.get(id=payment.id)
    print(f"✅ Final Payment Status: {refetched_payment.status}")
    
    assert refetched_payment.status == "completed", f"Expected completed, got {refetched_payment.status}"
    assert refetched_payment.transactions.count() == 1, "Transaction not linked correctly"
    
    print("🎉 Payment Logic Verified!")

if __name__ == "__main__":
    try:
        verify_payment_flow()
    except Exception as e:
        print(f"❌ Verification Failed: {e}")
