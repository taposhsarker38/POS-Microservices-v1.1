
import yaml

COMPOSE_FILE = "docker-compose.single-db.yml"

# Services to enable 'runserver' for (Django services)
DJANGO_SERVICES = [
    "accounting", "asset", "company", "customer", "hrms-service", 
    "inventory", "logistics-service", "manufacturing", "notification", 
    "payment", "pos", "product", "promotion", "purchase", 
    "quality-service", "reporting", "ai-service", "auth-service"
]

def enable_dev_mode():
    with open(COMPOSE_FILE, "r") as f:
        data = yaml.safe_load(f)

    services = data.get("services", {})
    
    modified_count = 0
    for name, service in services.items():
        # Check if it's a django service (by name match)
        # Note: some names in compose are 'accounting', some 'ai-service'
        # We need to match the keys in 'services' dict.
        
        # Helper: check against list
        is_django = False
        if name in DJANGO_SERVICES:
            is_django = True
        
        if is_django:
            print(f"Enabling Hot Reload for {name}...")
            # Set command to runserver
            service["command"] = "python manage.py runserver 0.0.0.0:8000"
            modified_count += 1
            
            # Also increase memory limit slightly for dev overhead if needed? 
            # 256MB is set. Let's keep it for now, runserver is usually okay.

    if modified_count > 0:
        with open(COMPOSE_FILE, "w") as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)
        print(f"✅ Enabled Dev Mode for {modified_count} services in {COMPOSE_FILE}")
    else:
        print("❌ No matching services found to update.")

if __name__ == "__main__":
    enable_dev_mode()
