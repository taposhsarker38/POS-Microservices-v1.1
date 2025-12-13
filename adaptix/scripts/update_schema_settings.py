
import os
import glob

SERVICES_DIR = "/mnt/01DBD436B086D330/New folder (2)/POS-Microservices-v1.1/adaptix/services"

SCHEMA_CONFIG = """
# ==============================================
# SCHEMA SUPPORT (Added for Single DB Migration)
# ==============================================
import dj_database_url
import os

database_url = os.environ.get("DATABASE_URL")
db_schema = os.environ.get("DB_SCHEMA", "public")

if database_url:
    try:
        db_config = dj_database_url.parse(database_url)
        # Add schema to search path (schema first, then public)
        db_config['OPTIONS'] = {'options': f'-c search_path={db_schema},public'}
        DATABASES = {"default": db_config}
        print(f"✅ Loaded Single DB Config for Schema: {db_schema}")
    except Exception as e:
        print(f"⚠️ Failed to configure Single DB: {e}")
# ==============================================
"""

def update_service_settings():
    services = [d for d in os.listdir(SERVICES_DIR) if os.path.isdir(os.path.join(SERVICES_DIR, d))]
    
    for service in services:
        settings_path = os.path.join(SERVICES_DIR, service, "config", "settings.py")
        
        # Some services might follow different structure, checking...
        if not os.path.exists(settings_path):
             # Try finding settings.py recursively
             found = glob.glob(os.path.join(SERVICES_DIR, service, "**", "settings.py"), recursive=True)
             if found:
                 settings_path = found[0]
             else:
                 print(f"❌ Could not find settings.py for {service}")
                 continue
        
        print(f"🔄 Updating {service} settings at {settings_path}...")
        
        with open(settings_path, "r") as f:
            content = f.read()
        
        if "SCHEMA SUPPORT" in content:
            print(f"  ⏭️  Already updated.")
            continue
            
        with open(settings_path, "a") as f:
            f.write(SCHEMA_CONFIG)
            
        print(f"  ✅ Updated.")

if __name__ == "__main__":
    update_service_settings()
