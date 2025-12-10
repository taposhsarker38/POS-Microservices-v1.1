# services/company/apps/tenants/services.py
from .models import Company, Employee, InvoiceSettings
from django.db import transaction
from django.utils import timezone
import uuid

class CompanySyncService:
    @staticmethod
    def sync_company_created(data: dict):
        auth_uuid = data.get("id") or data.get("uuid")  # be flexible
        if not auth_uuid:
            print("company.created without id")
            return
        defaults = {
            "name": data.get("name"),
            "code": data.get("code"),
            "tax_number": data.get("tax_number"),
            "vat_rate": data.get("vat_rate") or 0,
            "bin_number": data.get("bin_number"),
            "address": data.get("address"),
            "timezone": data.get("timezone", "UTC"),
            "metadata": data.get("metadata", {}),
        }
        company, created = Company.objects.update_or_create(
            auth_company_uuid=auth_uuid,
            defaults=defaults
        )
        if created:
            # create default invoice settings
            InvoiceSettings.objects.create(company=company)
            print("Created company:", company)
        else:
            print("Updated company:", company)

    @staticmethod
    def sync_company_updated(data: dict):
        auth_uuid = data.get("id") or data.get("uuid")
        if not auth_uuid:
            return
        defaults = {
            "name": data.get("name"),
            "code": data.get("code"),
            "tax_number": data.get("tax_number"),
            "vat_rate": data.get("vat_rate") or 0,
            "bin_number": data.get("bin_number"),
            "address": data.get("address"),
            "timezone": data.get("timezone", "UTC"),
            "metadata": data.get("metadata", {}),
        }
        Company.objects.filter(auth_company_uuid=auth_uuid).update(**defaults)
        print("Company updated for", auth_uuid)

    @staticmethod
    def sync_user_created(data: dict):
        # create employee if company exists
        auth_company_uuid = data.get("company_uuid")
        if not auth_company_uuid:
            # user without company; ignore or queue
            return
        # use external_user_id = data["id"]
        defaults = {
            "first_name": data.get("first_name") or data.get("username"),
            "last_name": data.get("last_name", ""),
            "email": data.get("email"),
            "is_active": data.get("is_active", True),
        }
        try:
            company = Company.objects.get(auth_company_uuid=auth_company_uuid)
        except Company.DoesNotExist:
            print("Company not found for user.created:", auth_company_uuid)
            return
        emp, created = Employee.objects.update_or_create(
            external_user_id=data.get("id"),
            company=company,
            defaults=defaults
        )
        print("Employee synced:", emp)

    @staticmethod
    def sync_user_updated(data: dict):
        # similar to create
        external_id = data.get("id")
        if not external_id:
            return
        defaults = {
            "first_name": data.get("first_name") or data.get("username"),
            "email": data.get("email"),
            "is_active": data.get("is_active", True),
        }
        Employee.objects.filter(external_user_id=external_id).update(**defaults)
        print("Employee updated:", external_id)
