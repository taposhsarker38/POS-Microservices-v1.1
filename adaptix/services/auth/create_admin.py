
import os
import django
import sys
import uuid

# Setup Django Environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

def create_admin_user():
    User = get_user_model()
    email = "admin@adaptix.com"
    password = "admin"
    
    # Ensure Company Exists
    from apps.accounts.models import Company
    company, _ = Company.objects.get_or_create(
        name="Adaptix Test Corp",
        defaults={
            "code": "ADAPTIX_TEST",
            "tax_number": "123456789",
            "vat_rate": 10.00
        }
    )

    username = "admin"
    if not User.objects.filter(username=username).exists():
        print(f"🔹 Creating superuser: {username}")
        
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name="Admin",
            last_name="User",
            company=company,
            is_active=True,
            is_staff=True,
            email_verified=True
        )
        print("✅ Superuser created successfully.")
    else:
        print("✅ Superuser already exists. Resetting password...")
        user = User.objects.get(username=username)
        print(f"🔹 Found user: {user.username} with email: {user.email}")
        
        if user.email != email:
            print(f"⚠️ Updating email from {user.email} to {email}")
            user.email = email
        
        # Ensure Company is assigned
        if not user.company:
            print(f"⚠️ Assigning company {company.name} to user")
            user.company = company

        user.email_verified = True
        user.set_password(password)
        user.save()
        print("✅ Password reset to 'admin', email verified, and company assigned.")

if __name__ == "__main__":
    create_admin_user()
