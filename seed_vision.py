
import os
import django
import uuid
import random
from datetime import datetime, timedelta
from django.utils import timezone

# 1. Setup Company/Tenants Data
def seed_company_data():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    from apps.tenants.models import Company, Wing
    
    company, _ = Company.objects.get_or_create(
        name="Adaptix Enterprise",
        defaults={
            "auth_company_uuid": uuid.uuid4(),
            "code": "ADPTX",
            "business_type": "RETAIL"
        }
    )
    
    wings = [
        {"name": "Banani Outlet", "code": "BAN01"},
        {"name": "Dhanmondi Store", "code": "DHN01"},
        {"name": "Gazipur Factory", "code": "GZP01"},
        {"name": "Head Office", "code": "OFF01"},
    ]
    
    created_wings = []
    for w in wings:
        wing, _ = Wing.objects.get_or_create(
            company=company,
            code=w['code'],
            defaults={"name": w['name']}
        )
        created_wings.append(wing)
        print(f"Ensured Wing: {wing.name} ({wing.id})")
    
    return created_wings

# 2. Setup Vision Data
def seed_vision_data(wings):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    from apps.vision.models import Camera, FootfallStats, PresenceLog
    
    for wing in wings:
        # Create a camera for each wing
        camera, _ = Camera.objects.get_or_create(
            name=f"Main Entrance - {wing.name}",
            branch_uuid=wing.id,
            defaults={
                "environment_type": "FACTORY" if "Factory" in wing.name else "OFFICE" if "Office" in wing.name else "RETAIL",
                "location_description": "Primary gate monitoring"
            }
        )
        print(f"Ensured Camera: {camera.name}")
        
        # Seed Footfall (Today)
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        for i in range(12):
            ts = now - timedelta(hours=i)
            FootfallStats.objects.get_or_create(
                camera=camera,
                timestamp=ts,
                defaults={
                    "entries": random.randint(5, 50),
                    "exits": random.randint(2, 40)
                }
            )
            
        # Seed Presence Logs
        names = ["Taposh Sarker", "Abdullah Al Noman", "Visitor-X", "Staff-01"]
        for _ in range(10):
            PresenceLog.objects.create(
                camera=camera,
                person_id=random.choice(names),
                person_type=random.choice(['EMPLOYEE', 'VISITOR']),
                direction=random.choice(['IN', 'OUT']),
                timestamp=timezone.now() - timedelta(minutes=random.randint(5, 300))
            )

if __name__ == "__main__":
    # This script needs to be run twice or adjusted to use the correct service contexts.
    # Since they share a single DB in this setup, we can potentially run it in one go if models are available,
    # but usually services are isolated.
    print("Run this script within the context of each service or use the provided commands.")
