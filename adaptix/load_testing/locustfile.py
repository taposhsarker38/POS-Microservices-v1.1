
from locust import HttpUser, task, between
import json
import random
import uuid

class AdaptixUser(HttpUser):
    wait_time = between(1, 3)
    
    # Store token securely
    token = None
    company_uuid = None
    
    
    def on_start(self):
        """Authenticated User Setup"""
        # Spoof User Agent
        self.client.headers.update({
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })

        # 1. Login
        response = self.client.post("/api/auth/login/", json={
            "username": "admin",
            "password": "admin"
        })
        
        if response.status_code == 200:
            json_response = response.json()
            self.token = json_response.get("data", {}).get("access")
            
            # Fetch Company UUID
            user_resp = self.client.get("/api/auth/users/me/", headers={"Authorization": f"Bearer {self.token}"})
            if user_resp.status_code == 200:
                self.company_uuid = user_resp.json().get("company_uuid")
        else:
            print(f"Login Failed! Status: {response.status_code}, Body: {response.text}")

    @task(1)
    def view_profile(self):
        if self.token:
            with self.client.get("/api/auth/users/me/", headers={"Authorization": f"Bearer {self.token}"}, catch_response=True) as response:
                if response.status_code != 200:
                    response.failure(f"Profile Failed: {response.status_code} - {response.text}")
                    print(f"Profile Failed! Status: {response.status_code}, Body: {response.text}")

    @task(2)
    def list_products(self):
        if self.token:
            with self.client.get("/api/product/", headers={"Authorization": f"Bearer {self.token}"}, catch_response=True) as response:
                if response.status_code != 200:
                    response.failure(f"Products Failed: {response.status_code}")
                    print(f"Products Failed! Status: {response.status_code}, Body: {response.text}")

    @task(3)
    def pos_transaction(self):
        if self.token and self.company_uuid:
            order_payload = {
                "branch_id": 1, # Mock branch
                "customer_phone": "555-0199",
                "items": [
                    {
                        "product_uuid": str(uuid.uuid4()), # In real test, fetch existing
                        "quantity": random.randint(1, 5),
                        "unit_price": 100
                    }
                ],
                "payments": [
                    {"method": "cash", "amount": 100}
                ]
            }
            # Note: This might 404 if product doesn't exist, but tests Gateway load
            with self.client.post("/api/sales/orders/", json=order_payload, headers={"Authorization": f"Bearer {self.token}"}, catch_response=True) as response:
                if response.status_code not in [200, 201]:
                    response.failure(f"POS Failed: {response.status_code}")
                    print(f"POS Failed! Status: {response.status_code}, Body: {response.text}")

    @task(1)
    def check_inventory(self):
        if self.token:
            with self.client.get("/api/inventory/stocks/", headers={"Authorization": f"Bearer {self.token}"}, catch_response=True) as response:
                if response.status_code != 200:
                    response.failure(f"Inventory Failed: {response.status_code}")
                    print(f"Inventory Failed! Status: {response.status_code}, Body: {response.text}")
