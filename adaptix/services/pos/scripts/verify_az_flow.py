
import requests
import uuid
import time
import sys
import json

# Configuration
COMPANY_UUID = str(uuid.uuid4())
WING_UUID = str(uuid.uuid4())

# Service URLs
AUTH_URL = "http://adaptix-auth-service:8000/api/auth/"
PRODUCT_BASE = "http://adaptix-product:8000/api/product/"
INVENTORY_BASE = "http://adaptix-inventory:8000/api/inventory/"
POS_URL = "http://adaptix-pos:8000/api/pos/orders/"
REPORTING_URL = "http://adaptix-reporting:8000/api/reporting/dashboard/dashboard/"
ACCOUNTING_URL = "http://adaptix-accounting:8000/api/accounting/ledger/journals/"

HEADERS = {
    "Content-Type": "application/json",
    "X-Company-UUID": COMPANY_UUID,
}

def step(name):
    print(f"\n[STEP] {name}")

def get_auth_token():
    step("Authenticating as Admin")
    try:
        resp = requests.post(AUTH_URL + "login/", json={"username": "admin", "password": "admin"})
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Logged In")
            return data.get('data', {}).get('access') or data.get('access')
        print(f"❌ Auth Failed: {resp.text}")
        return None
    except Exception as e:
        print(f"❌ Auth Service Unreachable: {e}")
        return None

def create_dependency(name, url, payload):
    try:
        resp = requests.post(url, json=payload, headers=HEADERS)
        if resp.status_code in [200, 201]:
            data = resp.json()
            print(f"✅ {name} Created: {data.get('id')}")
            return data.get('id')
        print(f"❌ Failed to create {name}: {resp.text}")
        return None
    except Exception as e:
        print(f"❌ Service Unreachable ({name}): {e}")
        return None

def run_test():
    print(f"Starting A-Z System Verification")
    
    # 0. Auth
    token = get_auth_token()
    if not token: return
    HEADERS["Authorization"] = f"Bearer {token}"
    
    print(f"Context: Company={COMPANY_UUID}")

    # 1. Prerequisites (Product Service)
    step("Creating Prerequisites")
    brand_id = create_dependency("Brand", PRODUCT_BASE + "brands/", {"name": "Test Brand", "code": "TB"})
    category_id = create_dependency("Category", PRODUCT_BASE + "categories/", {"name": "Test Cat", "code": "TC"})
    unit_id = create_dependency("Unit", PRODUCT_BASE + "units/", {"name": "Piece", "code": "PCS", "short_name": "PCS"})
    
    # Warehouse (Inventory Service)
    warehouse_id = create_dependency("Warehouse", INVENTORY_BASE + "warehouses/", {"name": "Test Warehouse", "code": "TW", "address": "Test Addr"})

    if not all([brand_id, category_id, unit_id, warehouse_id]):
        print("Stopping due to prerequisite failure.")
        return

    # 2. Create Product
    step("Creating Product")
    product_data = {
        "name": "Test Item A-Z",
        "sku": f"SKU-{uuid.uuid4().hex[:8]}",
        "description": "Auto-generated test product",
        "price": "100.00",
        "cost": "50.00",
        "brand": brand_id,
        "category": category_id,
        "unit": unit_id,
        "tax_rate": 0,
        "type": "consumable" # Ensure it's stockable
    }
    product_id = create_dependency("Product", PRODUCT_BASE + "products/", product_data)
    if not product_id: return

    # 3. Add Stock
    step("Adding Inventory")
    adjust_payload = {
        "warehouse_id": warehouse_id,
        "product_uuid": product_id,
        "quantity": 100,
        "type": "add",
        "notes": "Initial Stock"
    }
    try:
        resp = requests.post(INVENTORY_BASE + "stocks/adjust/", json=adjust_payload, headers=HEADERS)
        if resp.status_code in [200, 201]:
            print(f"✅ Stock Added: 100 units")
        else:
            print(f"❌ Failed to add stock: {resp.text}")
    except Exception as e:
        print(f"❌ Inventory Service Unreachable: {e}")

    # 4. Create Sale (POS)
    step("Processing Sale")
    order_data = {
        "customer": str(uuid.uuid4()), # Mock customer ID (POS might not validate strictly or we need customer)
        # Verify if customer validation exists. Assuming loose validation for now.
        "items": [
            {
                "product": product_id,
                "product_name": "Test Item A-Z",
                "quantity": 2,
                "unit_price": "100.00",
                "total_price": "200.00"
            }
        ],
        "total_amount": "200.00",
        "payment_method": "CASH",
        "wing": WING_UUID 
    }
    
    try:
        resp = requests.post(POS_URL, json=order_data, headers=HEADERS)
        if resp.status_code == 201:
            order = resp.json()
            print(f"✅ Sale Completed: Order {order.get('id')}")
        else:
            print(f"❌ Sale Failed: {resp.text}")
            return # Block verification if sale fails
    except Exception as e:
        print(f"❌ POS Service Unreachable: {e}")
        return

    # Wait for Async Events
    step("Waiting for Async Events (10s)...")
    time.sleep(10) 

    # 5. Verify Reporting
    step("Verifying Analytics (Branch)")
    try:
        # Filter by Wing
        resp = requests.get(f"{REPORTING_URL}?wing_uuid={WING_UUID}", headers=HEADERS)
        data = resp.json()
        print(f"Reporting Data: {data}")
        if float(data.get('total_revenue', 0)) >= 200.0:
             print(f"✅ Revenue Logic Verified")
        else:
             print(f"❌ Revenue Mismatch: Expected >= 200, got {data.get('total_revenue')}")
    except Exception as e:
        print(f"⚠️ Reporting Verification Failed: {e}")
        try: print(f"Response Text: {resp.text[:500]}") 
        except: pass

    # 6. Verify Accounting
    step("Verifying Accounting Ledger")
    try:
        resp = requests.get(ACCOUNTING_URL, headers=HEADERS)
        entries = resp.json()
        if isinstance(entries, dict) and 'results' in entries: entries = entries['results']
        
        if len(entries) > 0:
            print(f"✅ Journal Entries Found: {len(entries)}")
            print(f"   Sample: {entries[0].get('reference_number', 'No Ref')}")
        else:
            print(f"❌ No Journal Entries found. Integration might be broken.")
    except Exception as e:
        print(f"⚠️ Accounting Verification Failed: {e}")
        try: print(f"Response Text: {resp.text[:500]}") 
        except: pass

if __name__ == "__main__":
    run_test()
