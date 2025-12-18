import subprocess
import time

SERVICES = [
    # Batch 1
    "adaptix-inventory",
    "adaptix-purchase",
    "adaptix-logistics", 
    # Batch 2
    "adaptix-quality-service", 
    "adaptix-intelligence",
    "adaptix-company",
    "adaptix-auth-service",
    # Batch 3
    "adaptix-product",
    "adaptix-payment",
    "adaptix-customer",
    "adaptix-asset",
    # Batch 4
    "adaptix-accounting",
    "adaptix-notification",
    "adaptix-promotion",
    "adaptix-reporting"
]

def check_service(container_name):
    print(f"Checking {container_name}...", end=" ")
    try:
        # Check if container is running
        ps_cmd = f"docker ps -q -f name={container_name}"
        cid = subprocess.check_output(ps_cmd, shell=True).decode().strip()
        if not cid:
            print("❌ NOT RUNNING")
            return False
            
        # Check if adaptix_core is importable
        cmd = f"docker exec {container_name} python -c 'import adaptix_core; print(\"Import OK\")'"
        result = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT).decode().strip()
        
        if "Import OK" in result:
            print("✅ Core Integrated")
            return True
        else:
            print(f"❌ Import Failed: {result}")
            return False
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e.output.decode().strip() if e.output else e}")
        return False

def main():
    print("Waiting 10s for services to stabilize...")
    time.sleep(10)
    
    success_count = 0
    for svc in SERVICES:
        if check_service(svc):
            success_count += 1
            
    print(f"\nSummary: {success_count}/{len(SERVICES)} Services Verified.")

if __name__ == "__main__":
    main()
