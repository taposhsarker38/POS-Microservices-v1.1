import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.mrp.models import ProductionOrder

def backfill():
    orders = ProductionOrder.objects.filter(product_name__isnull=True)
    print(f"Found {orders.count()} orders to backfill.")
    
    # We need a token. Since this is internal, we might need a workaround or just hit the internal DB if possible.
    # But hitting the API is safer for microservice boundaries.
    # Let's try to hit the internal DB of the product service or use a dummy token if the product service allows internal calls.
    # Actually, the quickest way is to just use the ProductionOrder's product_uuid and update it.
    
    for order in orders:
        print(f"Backfilling PO-{order.id} (Product: {order.product_uuid})")
        try:
            # Try to fetch name from Product Service
            # We'll use the internal service name
            resp = requests.get(f"http://adaptix-product:8000/api/product/products/{order.product_uuid}/", timeout=5)
            if resp.status_code == 200:
                name = resp.json().get('name')
                if name:
                    order.product_name = name
                    order.save()
                    print(f"  Success: {name}")
                else:
                    print(f"  Failed: Name not found in response")
            else:
                print(f"  Failed: Product service returned {resp.status_code}")
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == '__main__':
    backfill()
