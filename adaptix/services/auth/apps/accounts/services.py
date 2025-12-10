from .models import Company, Employee

class CompanySyncService:
    @staticmethod
    def sync_company_created(data):
        Company.objects.update_or_create(
            code=data["code"],
            defaults=data
        )
        print("Synced company:", data["name"])

    @staticmethod
    def sync_company_updated(data):
        Company.objects.filter(code=data["code"]).update(**data)
        print("Updated company:", data["name"])

    @staticmethod
    def sync_user_created(data):
        Employee.objects.update_or_create(
            external_user_id=data["id"],
            company_id=data["company_id"],
            defaults={
                "first_name": data["first_name"],
                "last_name": data["last_name"],
                "email": data["email"],
                "phone": data["phone"],
                "role": data["role"]
            }
        )
        print("Synced employee:", data["email"])

    @staticmethod
    def sync_user_updated(data):
        Employee.objects.filter(external_user_id=data["id"]).update(
            role=data["role"],
            email=data["email"]
        )
        print("Updated employee:", data["email"])
