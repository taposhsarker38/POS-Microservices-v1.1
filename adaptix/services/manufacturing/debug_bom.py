import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.mrp.models import BillOfMaterial, Operation, WorkCenter, BOMOperation
from apps.mrp.serializers import BillOfMaterialSerializer
from rest_framework.test import APIRequestFactory

# specific BOM and Operation setup
def run():
    # Ensure dependencies exist
    wc, _ = WorkCenter.objects.get_or_create(name="Debug WC", code="DWC01", capacity_per_day=100)
    op, _ = Operation.objects.get_or_create(name="Debug Op", code="DOP01", work_center=wc)
    
    import uuid
    # Create a BOM
    bom = BillOfMaterial.objects.create(product_uuid=uuid.uuid4(), name="Debug BOM", quantity=1)
    print(f"BOM Created: {bom.id}")
    
    # Payload simulating the frontend update
    payload = {
        "product_uuid": str(bom.product_uuid),
        "name": "Debug BOM Updated",
        "quantity": 1.0,
        "items": [], # Empty items for simplicity as we focus on ops
        "operations": [
            {
                "operation": op.id,
                "sequence": 1,
                "estimated_time_minutes": 120
            }
        ]
    }
    
    # Serialize and Validate
    serializer = BillOfMaterialSerializer(instance=bom, data=payload, partial=True)
    if serializer.is_valid():
        print("Serializer Valid.")
        serializer.save()
        
        # Verify
        bom.refresh_from_db()
        ops = list(bom.operations.all())
        print(f"BOM Operations Count: {len(ops)}")
        if len(ops) > 0:
            print(f"Op 1: {ops[0].operation.name}, Time: {ops[0].estimated_time_minutes}")
        else:
            print("ERROR: No operations found after update!")
    else:
        print("Serializer Invalid:", serializer.errors)

if __name__ == '__main__':
    run()
