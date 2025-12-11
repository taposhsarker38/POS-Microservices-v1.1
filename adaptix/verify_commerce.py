import requests
import json
import time
import base64

GATEWAY_URL = "http://localhost:8101"

def print_result(name, passed, details=""):
    icon = "✅" if passed else "❌"
    print(f"{icon} {name}: {details}")

def get_auth_headers():
    # 1. Register & Login & Create Company
    email = f"commerce_{int(time.time())}@test.com"
    password = "StrongPassword123!"
    username = email.split("@")[0]

    # Register
    requests.post(f"{GATEWAY_URL}/api/auth/register/", json={
        "email": email, "username": username, "password": password, "confirm_password": password,
        "first_name": "Commerce", "last_name": "Admin"
    })
    
    # Login
    resp = requests.post(f"{GATEWAY_URL}/api/auth/login/", json={"username": username, "password": password})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return None, None
    token = resp.json().get("data", {}).get("access")
    headers = {"Authorization": f"Bearer {token}"}

    # Create Company
    resp = requests.post(f"{GATEWAY_URL}/api/auth/companies/", headers=headers, json={
        "name": f"Commerce Co {int(time.time())}",
        "code": f"COM-{int(time.time())}",
        "domain": f"com{int(time.time())}.adaptix.com",
        "is_active": True
    })
    if resp.status_code != 201:
        print(f"Company create failed: {resp.text}")
        return None, None
    company_uuid = resp.json().get("uuid")

    # Re-Login for permissions
    resp = requests.post(f"{GATEWAY_URL}/api/auth/login/", json={"username": username, "password": password})
    token = resp.json().get("data", {}).get("access")
    return {"Authorization": f"Bearer {token}"}, company_uuid

def verify_commerce():
    print("\n--- Verifying Commerce Services (Purchase, POS, Customer, Promotion) ---\n")
    headers, company_uuid = get_auth_headers()
    if not headers:
        return

    # 1. Product Setup (Needed for Purchase/POS)
    # Create Category
    cat_id = None
    resp = requests.post(f"{GATEWAY_URL}/api/product/categories/", headers=headers, json={"name": "General"})
    if resp.status_code == 201:
        cat_id = resp.json().get("id")
    
    # Create Product
    product_uuid = None
    resp = requests.post(f"{GATEWAY_URL}/api/product/products/", headers=headers, json={
        "name": "Test Item", "sku": f"SKU-{int(time.time())}", "price": "100.00", 
        "category": cat_id, "product_type": "standard"
    })
    if resp.status_code == 201:
        product_uuid = resp.json().get("id")
    else:
        print_result("Setup: Create Product", False, resp.text)
        return

    # 2. Purchase Service
    try:
        # Create Vendor
        resp = requests.post(f"{GATEWAY_URL}/api/purchase/vendors/", headers=headers, json={
            "name": "Supplier A", "email": "supplier@test.com"
        })
        if resp.status_code == 201:
            vendor_id = resp.json().get("id")
            print_result("Purchase: Create Vendor", True)
            
            # Create PO
            print(f"Creating PO with product_uuid: {product_uuid}")
            resp = requests.post(f"{GATEWAY_URL}/api/purchase/orders/", headers=headers, json={
                "vendor": vendor_id,
                "items": [{"product_uuid": product_uuid, "quantity": 10, "unit_cost": "50.00"}]
            })
            if resp.status_code == 201:
                print_result("Purchase: Create Order", True)
            else:
                print_result("Purchase: Create Order", False, resp.text)
        else:
             print_result("Purchase: Create Vendor", False, resp.text)
    except Exception as e:
        print_result("Purchase: Service", False, str(e))

    # 3. Customer Service
    customer_id = None
    try:
        resp = requests.post(f"{GATEWAY_URL}/api/customer/customers/", headers=headers, json={
            "name": "John Doe", "email": f"john{int(time.time())}@doe.com", "phone": f"{int(time.time())}"
        })
        if resp.status_code == 201:
            customer_id = resp.json().get("id")
            print_result("Customer: Create", True)
        else:
            print_result("Customer: Create", False, resp.text)
    except Exception as e:
        print_result("Customer: Service", False, str(e))

    # 4. POS Service (Create Order)
    try:
        if customer_id and product_uuid:
            resp = requests.post(f"{GATEWAY_URL}/api/pos/orders/", headers=headers, json={
                "customer": customer_id,
                "items": [{"product_uuid": product_uuid, "product_name": "Test Item", "quantity": 1, "unit_price": "100.00"}]
            })
            if resp.status_code == 201:
                print_result("POS: Create Order", True)
            else:
                print_result("POS: Create Order", False, resp.text)
        else:
            print_result("POS: Create Order", False, "Skipped (missing dependencies)")
    except Exception as e:
         print_result("POS: Service", False, str(e))

    # 5. Promotion Service (Coupons)
    try:
        resp = requests.post(f"{GATEWAY_URL}/api/promotion/coupons/", headers=headers, json={
            "code": f"SAVE{int(time.time())}", "discount_type": "percent", "value": "10.00"
        })
        if resp.status_code == 201:
            print_result("Promotion: Create Coupon", True)
        else:
            print_result("Promotion: Create Coupon", False, resp.text)
    except Exception as e:
        print_result("Promotion: Service", False, str(e))

if __name__ == "__main__":
    verify_commerce()
