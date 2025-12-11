import requests
import json
import time
import sys
import base64

# Configuration
GATEWAY_URL = "http://localhost:8101"

def print_result(test_name, success, details=""):
    status = "✅" if success else "❌"
    print(f"{status} {test_name}: {details}")

def get_company_uuid_from_token(token):
    """Extract company_uuid from JWT payload"""
    try:
        payload = token.split(".")[1]
        payload += "=" * ((4 - len(payload) % 4) % 4)
        data = json.loads(base64.b64decode(payload).decode())
        return data.get("company_uuid")
    except:
        return None

def get_auth_headers():
    # Self-contained logic: Register and Login
    email = f"hrtest_{int(time.time())}@example.com"
    password = "StrongPassword123!"
    company_uuid = None
    
    # Register
    try:
        reg_resp = requests.post(f"{GATEWAY_URL}/api/auth/register/", json={
            "email": email,
            "username": email.split("@")[0],
            "password": password,
            "confirm_password": password,
            "first_name": "HR",
            "last_name": "Admin"
        })
        if reg_resp.status_code != 201:
            print(f"Registration failed: {reg_resp.text}")
    except Exception as e:
        print(f"Registration exception: {e}")

    # Login
    try:
        resp = requests.post(f"{GATEWAY_URL}/api/auth/login/", json={
            "username": email.split("@")[0],
            "password": password
        })
        if resp.status_code == 200:
            token = resp.json().get("access") or resp.json().get("data", {}).get("access")
            if token:
                headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                
                # Create Company
                comp_payload = {
                    "name": f"HR Corp {int(time.time())}",
                    "code": f"HR-{int(time.time())}",
                    "domain": f"hr{int(time.time())}.corp.com",
                    "is_active": True
                }
                create_resp = requests.post(f"{GATEWAY_URL}/api/auth/companies/", headers=headers, json=comp_payload)
                if create_resp.status_code == 201:
                    print(f"Created Company: {comp_payload['name']}")
                    company_uuid = create_resp.json().get("uuid")
                    
                    # Re-login to update token
                    login_resp_2 = requests.post(f"{GATEWAY_URL}/api/auth/login/", json={
                         "username": email.split("@")[0],
                         "password": password
                    })
                    token_2 = login_resp_2.json().get("data", {}).get("access")
                    company_uuid = get_company_uuid_from_token(token_2) or company_uuid
                    return {"Authorization": f"Bearer {token_2}", "Content-Type": "application/json"}, company_uuid
                else:
                    print(f"Company creation failed: {create_resp.text}")
        else:
            print(f"Login failed: {resp.text}")
    except Exception as e:
        print(f"Login failed: {e}")
    return None, None

def verify_hr_finance():
    print("\n--- Verifying HR & Finance Services (HRMS, Accounting, Asset, Reporting) ---\n")
    headers, company_uuid = get_auth_headers()
    if not headers:
        print("Setup failed. Exiting.")
        sys.exit(1)
    
    print(f"Company UUID: {company_uuid}")
    
    department_id = None
    designation_id = None
    employee_id = None
    asset_category_id = None
    asset_id = None

    # === HRMS Service ===
    try:
        # 1a. Create Department
        dept_resp = requests.post(f"{GATEWAY_URL}/api/hrms/employees/departments/", headers=headers, json={
            "name": "Finance",
            "code": "FIN",
            "company_uuid": company_uuid
        })
        if dept_resp.status_code == 201:
            department_id = dept_resp.json().get("id")
            print_result("HRMS: Create Department", True)
        else:
            print_result("HRMS: Create Department", False, dept_resp.text)
        
        # 1b. Create Designation
        desig_resp = requests.post(f"{GATEWAY_URL}/api/hrms/employees/designations/", headers=headers, json={
            "name": "Accountant",
            "rank": 5,
            "company_uuid": company_uuid
        })
        if desig_resp.status_code == 201:
            designation_id = desig_resp.json().get("id")
            print_result("HRMS: Create Designation", True)
        else:
            print_result("HRMS: Create Designation", False, desig_resp.text)
        
        # 1c. Create Employee
        emp_payload = {
            "first_name": "Alice",
            "last_name": "Finance",
            "email": f"alice{int(time.time())}@company.com",
            "phone": f"{int(time.time())}",
            "employee_code": f"EMP-{int(time.time())}",
            "joining_date": "2023-01-01",
            "company_uuid": company_uuid,
        }
        if department_id:
            emp_payload["department"] = department_id
        if designation_id:
            emp_payload["designation"] = designation_id
            
        resp = requests.post(f"{GATEWAY_URL}/api/hrms/employees/list/", headers=headers, json=emp_payload)
        if resp.status_code == 201:
            employee_id = resp.json().get("id")
            print_result("HRMS: Create Employee", True)
        else:
            print_result("HRMS: Create Employee", False, resp.text)
            
    except Exception as e:
        print_result("HRMS: Service", False, str(e))

    # === Asset Service ===
    try:
        # 2a. Create Asset Category
        cat_resp = requests.post(f"{GATEWAY_URL}/api/asset/categories/", headers=headers, json={
            "name": "Laptops",
            "depreciation_method": "straight_line",
            "depreciation_rate": "20.00",
            "company_uuid": company_uuid
        })
        if cat_resp.status_code == 201:
            asset_category_id = cat_resp.json().get("id")
            print_result("Asset: Create Category", True)
        else:
            print_result("Asset: Create Category", False, cat_resp.text)
        
        # 2b. Create Asset
        if asset_category_id:
            asset_payload = {
                "name": "MacBook Pro",
                "category": asset_category_id,
                "purchase_cost": "2000.00",
                "purchase_date": "2023-06-01",
                "status": "active",
                "company_uuid": company_uuid
            }
            
            resp = requests.post(f"{GATEWAY_URL}/api/asset/assets/", headers=headers, json=asset_payload)
            if resp.status_code == 201:
                asset_id = resp.json().get("id")
                print_result("Asset: Create Asset", True)
            else:
                print_result("Asset: Create Asset", False, resp.text)
        else:
            print_result("Asset: Create Asset", False, "Skipped - no category")

    except Exception as e:
        print_result("Asset: Service", False, str(e))
        
    # === Accounting Service ===
    try:
        # 3a. Create Account Group
        group_resp = requests.post(f"{GATEWAY_URL}/api/accounting/ledger/groups/", headers=headers, json={
            "name": "Current Assets",
            "code": "CA",
            "group_type": "asset",
            "company_uuid": company_uuid
        })
        group_id = None
        if group_resp.status_code == 201:
            group_id = group_resp.json().get("id")
            print_result("Accounting: Create Group", True)
        else:
            print_result("Accounting: Create Group", False, group_resp.text)
        
        # 3b. Create Chart of Account
        cash_account_id = None
        if group_id:
            acc_resp = requests.post(f"{GATEWAY_URL}/api/accounting/ledger/accounts/", headers=headers, json={
                "name": "Cash",
                "code": f"CASH{int(time.time())}",
                "group": group_id,
                "company_uuid": company_uuid
            })
            if acc_resp.status_code == 201:
                cash_account_id = acc_resp.json().get("id")
                print_result("Accounting: Create Account", True)
            else:
                print_result("Accounting: Create Account", False, acc_resp.text)
        
        # 3c. Create Journal Entry
        if cash_account_id:
            journal_payload = {
                "date": "2023-12-01",
                "description": "Manual Entry Test",
                "company_uuid": company_uuid,
                "items": [
                    {"account": cash_account_id, "description": "Cash", "debit": "100.00", "credit": "0.00"},
                    {"account": cash_account_id, "description": "Cash reverse", "debit": "0.00", "credit": "100.00"}
                ]
            }
            
            resp = requests.post(f"{GATEWAY_URL}/api/accounting/ledger/journals/", headers=headers, json=journal_payload)
            if resp.status_code == 201:
                print_result("Accounting: Create Journal", True)
            else:
                print_result("Accounting: Create Journal", False, resp.text)
        else:
            print_result("Accounting: Create Journal", False, "Skipped - no accounts")
            
    except Exception as e:
        print_result("Accounting: Service", False, str(e))
        
    # === Reporting Service ===
    try:
        # Just check if the daily-sales endpoint is accessible (simpler than dashboard action)
        resp = requests.get(f"{GATEWAY_URL}/api/reporting/daily-sales/", headers=headers)
        if resp.status_code == 200:
            print_result("Reporting: Daily Sales", True)
        else:
            print_result("Reporting: Daily Sales", False, f"Status: {resp.status_code}")
             
    except Exception as e:
        print_result("Reporting: Service", False, str(e))

if __name__ == "__main__":
    verify_hr_finance()
