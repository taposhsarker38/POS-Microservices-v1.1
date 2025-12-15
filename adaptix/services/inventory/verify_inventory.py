
import os
import django
from decimal import Decimal
import sys
import uuid

# Setup Django Environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.stocks.models import Warehouse, Stock

def verify_inventory_flow():
    company_uuid = uuid.uuid4()
    product_uuid = uuid.uuid4()
    print(f"🔹 Starting Inventory Verification for Company: {company_uuid}")

    # 1. Create Warehouse
    warehouse = Warehouse.objects.create(
        company_uuid=company_uuid,
        name="Main Store",
        type="main"
    )
    print(f"✅ Created Warehouse: {warehouse.name}")

    # 2. Create Initial Stock (Opening Balance)
    stock = Stock.objects.create(
        company_uuid=company_uuid,
        warehouse=warehouse,
        product_uuid=product_uuid,
        quantity=Decimal("100.000"),
        reorder_level=Decimal("10.000"),
        avg_cost=Decimal("50.00")
    )
    print(f"✅ Created Stock: {stock.quantity} units of Product {product_uuid}")

    # 3. Simulate Adjustment (Adding Stock)
    # Ideally this goes through a Movement/Transaction model, but checking core Stock model updates first
    stock.quantity += Decimal("50.000")
    stock.save()
    
    # 4. Verify Final Count
    refetched_stock = Stock.objects.get(id=stock.id)
    print(f"✅ Final Stock Quantity: {refetched_stock.quantity}")
    
    assert refetched_stock.quantity == Decimal("150.000"), f"Expected 150.000, got {refetched_stock.quantity}"
    print("🎉 Inventory Logic Verified!")

if __name__ == "__main__":
    try:
        verify_inventory_flow()
    except Exception as e:
        print(f"❌ Verification Failed: {e}")
