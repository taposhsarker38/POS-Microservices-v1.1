import os
import django
import sys
from decimal import Decimal
from unittest.mock import patch

# Setup Django Environment
sys.path.append('/home/taposh/projects/POS-Microservices-v1.1/adaptix/services/inventory')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.iot.models import IoTDevice, Shelf, IoTReading
from apps.stocks.models import Warehouse, Stock
from apps.iot.serializers import IoTReadingSerializer
import uuid

def run_test():
    print("🚀 Starting IoT Verification Test...")
    
    # Cleanup previous run
    IoTDevice.objects.filter(device_id__in=["SCALE-001", "THERMO-001"]).delete()
    print("🧹 Cleaned up old devices")

    # 1. Setup Data
    company_uuid = uuid.uuid4()
    warehouse = Warehouse.objects.create(
        name="Test Warehouse",
        company_uuid=company_uuid
    )
    product_uuid = uuid.uuid4()
    
    print(f"✅ Created Warehouse: {warehouse.name}")

    # Create Shelf
    shelf = Shelf.objects.create(
        warehouse=warehouse,
        code="TEST-SHELF-01",
        product_uuid=product_uuid, # Assign product to shelf
        company_uuid=company_uuid
    )
    print(f"✅ Created Shelf: {shelf.code} for Product: {product_uuid}")

    # Create Initial Stock (0)
    stock = Stock.objects.create(
        warehouse=warehouse,
        product_uuid=product_uuid,
        company_uuid=company_uuid,
        quantity=0
    )
    print(f"✅ Created Initial Stock: {stock.quantity}")

    # 2. Register Smart Scale
    scale = IoTDevice.objects.create(
        device_id="SCALE-001",
        name="My Smart Scale",
        type="scale",
        warehouse=warehouse,
        shelf=shelf,
        company_uuid=company_uuid,
        tare_weight=0.5 # 0.5kg tray weight
    )
    print(f"✅ Registered Device: {scale}")

    # 3. Simulate Reading (Weight = 10.5kg). Net = 10.0kg. 
    # Assumed unit weight = 1.0kg. So Qty should be 10.
    
    print("📡 Simulating Weight Reading: 10.5 kg...")
    reading = IoTReading.objects.create(
        device=scale,
        value=Decimal("10.5"),
        unit="kg"
    )
    
    # Refresh Stock
    stock.refresh_from_db()
    
    print(f"📊 Stock Quantity after reading: {stock.quantity}")
    
    if stock.quantity == 10.0:
        print("✅ SUCCESS: Stock quantity updated correctly via Smart Scale!")
    else:
        print("❌ FAILURE: Stock quantity did not update correctly.")

    # 4. Thermometer Test
    thermometer = IoTDevice.objects.create(
        device_id="THERMO-001",
        name="Freezer Sensor",
        type="thermometer",
        warehouse=warehouse,
        company_uuid=company_uuid
    )
    
    print("📡 Simulating High Temp Reading: 30.0 C...")
    
    # We need to mock NotificationService to avoid errors and verify call
    with patch('apps.utils.notifications.NotificationService.send_notification') as mock_notify:
        IoTReading.objects.create(
            device=thermometer,
            value=Decimal("30.0"),
            unit="C"
        )
        
        if mock_notify.called:
            print("✅ SUCCESS: Temperature Alert Triggered!")
            args, _ = mock_notify.call_args
            print(f"   Alert Payload: {args}")
        else:
            print("❌ FAILURE: Temperature Alert NOT Triggered.")

if __name__ == '__main__':
    try:
        run_test()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
