import requests
import json
import time

GATEWAY_URL = "http://localhost:8101"

def print_result(name, passed, details=""):
    icon = "✅" if passed else "❌"
    print(f"{icon} {name}: {details}")

def verify_core():
    print("\n--- Verifying Core Services (Auth, Company, Product, Inventory) ---\n")
    
    # 1. Auth Service: Register & Login
    email = f"testadmin_{int(time.time())}@example.com"
    password = "StrongPassword123!"
    
    # Register
    try:
        reg_resp = requests.post(f"{GATEWAY_URL}/api/auth/register/", json={
            "email": email,
            "username": email.split("@")[0],
            "password": password,
            "confirm_password": password,
            "first_name": "Admin",
            "last_name": "User"
        })
        if reg_resp.status_code == 201:
            print_result("Auth: Register", True)
        else:
            print_result("Auth: Register", False, f"Status: {reg_resp.status_code}, Body: {reg_resp.text}")
            # If register fails, we might not be able to login, but let's try just in case it was a duplicate
    except Exception as e:
        print_result("Auth: Register", False, str(e))
        return

    # Login
    token = None
    try:
        login_resp = requests.post(f"{GATEWAY_URL}/api/auth/login/", json={
            "username": email.split("@")[0],
            "password": password
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("data", {}).get("access")
            print(f"Token: {token[:20]}...{token[-20:]}")
            try:
                import base64
                payload = token.split(".")[1]
                # Pad base64
                payload += "=" * ((4 - len(payload) % 4) % 4)
                print(f"Token Payload: {base64.b64decode(payload).decode()}")
            except Exception as e:
                print(f"Error decoding token: {e}")
            print_result("Auth: Login", True)
        else:
            print_result("Auth: Login", False, f"Status: {login_resp.status_code}")
            return
    except Exception as e:
        print_result("Auth: Login", False, str(e))
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Company Service: Create Tenant
    company_uuid = None
    try:
        # Check if any company exists first
        list_resp = requests.get(f"{GATEWAY_URL}/api/auth/companies/", headers=headers)
        if list_resp.status_code == 200 and isinstance(list_resp.json(), list) and len(list_resp.json()) > 0:
            company_uuid = list_resp.json()[0]['uuid']
            print_result("Company: List", True, "Used existing company")
        else:
            # Create
            payload = {
                "name": f"Test Company {int(time.time())}",
                "code": f"TEST-{int(time.time())}",
                "domain": f"test{int(time.time())}.adaptix.com",
                "is_active": True
            }
            create_resp = requests.post(f"{GATEWAY_URL}/api/auth/companies/", headers=headers, json=payload)
            if create_resp.status_code == 201:
                company_uuid = create_resp.json().get("uuid")
                print_result("Company: Create", True)
                
                # Re-login to get updated token with company_uuid
                print("Re-logging in to refresh token with Company UUID...")
                login_resp = requests.post(f"{GATEWAY_URL}/api/auth/login/", json={
                    "username": email.split("@")[0],
                    "password": password
                })
                if login_resp.status_code == 200:
                    token = login_resp.json().get("data", {}).get("access")
                    headers = {"Authorization": f"Bearer {token}"}
                    print("Token refreshed.")
                    try:
                        import base64
                        payload = token.split(".")[1]
                        payload += "=" * ((4 - len(payload) % 4) % 4)
                        print(f"Refreshed Token Payload: {base64.b64decode(payload).decode()}")
                    except:
                        pass
                else:
                    print(f"Failed to refresh token: {login_resp.status_code}")
                    return
            else:
                print_result("Company: Create", False, f"Status: {create_resp.status_code}, Body: {create_resp.text}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print_result("Company: Service", False, str(e))

    if not company_uuid:
        print("Skipping Product/Inventory verification due to missing Company UUID.")
        return

    # 3. Product Service: Create Category & Product
    product_uuid = None
    try:
        # Category
        cat_resp = requests.post(f"{GATEWAY_URL}/api/product/categories/", headers=headers, json={
            "name": "Electronics",
            "company_uuid": company_uuid
        })
        category_id = None
        if cat_resp.status_code in [200, 201]:
             # It might return a list or object depending on implementation, let's assume object
             category_id = cat_resp.json().get("id") or cat_resp.json().get("uuid") # Handle potential variation
             print_result("Product: Category Create", True)
        else:
             print_result("Product: Category Create", False, cat_resp.text)

        # Product
        prod_payload = {
            "name": f"Laptop {int(time.time())}",
            "sku": f"LAP-{int(time.time())}",
            "price": "1200.00",
            "company_uuid": company_uuid,
            "category": category_id
        }
        prod_resp = requests.post(f"{GATEWAY_URL}/api/product/products/", headers=headers, json=prod_payload)
        if prod_resp.status_code == 201:
            product_uuid = prod_resp.json().get("uuid")
            print_result("Product: Create", True)
        else:
            print_result("Product: Create", False, f"Status: {prod_resp.status_code}, Body: {prod_resp.text}")
    except Exception as e:
        print_result("Product: Service", False, str(e))

    if not product_uuid:
        return

    # 4. Inventory Service: Check Stock
    try:
        # Check specific product stock
        stock_resp = requests.get(f"{GATEWAY_URL}/api/inventory/stocks/?product_uuid={product_uuid}", headers=headers)
        if stock_resp.status_code == 200:
            print_result("Inventory: Check Stock", True)
        else:
            print_result("Inventory: Check Stock", False, f"Status: {stock_resp.status_code}")
    except Exception as e:
        print_result("Inventory: Service", False, str(e))

if __name__ == "__main__":
    verify_core()
