from django.core.management.base import BaseCommand
from apps.ledger.models import AccountGroup, ChartOfAccount
from django.db import transaction

class Command(BaseCommand):
    help = 'Standardize Account Groups and Chart of Accounts structure'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting Account Group Standardization...")
        
        # Get all unique companies that have account groups
        company_uuids = AccountGroup.objects.values_list('company_uuid', flat=True).distinct()
        
        for company_uuid in company_uuids:
            self.stdout.write(f"Processing Company: {company_uuid}")
            self.process_company(company_uuid)
            
        self.stdout.write(self.style.SUCCESS("Standardization Complete."))

    def process_company(self, company_uuid):
        STANDARD_GROUPS = {
            "asset": "Assets",
            "liability": "Liabilities",
            "equity": "Equity",
            "income": "Income",
            "expense": "Expenses"
        }

        with transaction.atomic():
            # 1. Create/Get Top Level Groups
            top_groups = {}
            for g_type, g_name in STANDARD_GROUPS.items():
                group, created = AccountGroup.objects.get_or_create(
                    company_uuid=company_uuid,
                    name=g_name,
                    defaults={
                        'group_type': g_type,
                        'code': g_name.upper()[:3],
                        'parent': None
                    }
                )
                if not created and group.group_type != g_type:
                    group.group_type = g_type
                    group.save()
                top_groups[g_type] = group

            # 2. Rename Old Generic Groups ("Asset Group", "Income Group") and make them children if needed
            # Or better, migrate their accounts to new structure and delete them? 
            # The user said "baki gula remove kore dio", implying cleanup.
            # Strategy: Move accounts to new specific subgroups, delete old generic groups.

            # Define Standard Subgroups
            SUBGROUPS = [
                ("asset", "Current Assets", top_groups["asset"]),
                ("asset", "Fixed Assets", top_groups["asset"]),
                ("liability", "Current Liabilities", top_groups["liability"]),
                ("liability", "Long Term Liabilities", top_groups["liability"]),
                ("equity", "Owners Equity", top_groups["equity"]),
                ("income", "Direct Income", top_groups["income"]),
                ("income", "Indirect Income", top_groups["income"]),
                ("expense", "Direct Expenses", top_groups["expense"]),
                ("expense", "Indirect Expenses", top_groups["expense"]),
            ]

            created_subgroups = {}
            for g_type, sub_name, parent in SUBGROUPS:
                sub, _ = AccountGroup.objects.get_or_create(
                    company_uuid=company_uuid,
                    name=sub_name,
                    parent=parent,
                    defaults={
                        'group_type': g_type,
                        'code': sub_name.upper()[:4].replace(" ", "")
                    }
                )
                created_subgroups[sub_name] = sub

            # 3. Move Existing Accounts
            # Map specific keywords to new subgroups
            
            all_accounts = ChartOfAccount.objects.filter(company_uuid=company_uuid)
            for acc in all_accounts:
                lower_name = acc.name.lower()
                
                # Assets
                if any(x in lower_name for x in ['cash', 'bank', 'petty', 'receivable', 'inventory', 'stock']):
                    acc.group = created_subgroups['Current Assets']
                elif any(x in lower_name for x in ['furniture', 'equipment', 'computer', 'vehicle', 'machine', 'property']):
                    acc.group = created_subgroups['Fixed Assets']
                
                # Income
                elif any(x in lower_name for x in ['sale', 'revenue', 'service charge']):
                    acc.group = created_subgroups['Direct Income']
                elif any(x in lower_name for x in ['discount received', 'interest income']):
                    acc.group = created_subgroups['Indirect Income']

                # Liabilities
                elif any(x in lower_name for x in ['payable', 'tax', 'vat', 'duty']):
                    acc.group = created_subgroups['Current Liabilities']
                
                # Expenses
                elif any(x in lower_name for x in ['purchase', 'cogs', 'cost of goods']):
                    acc.group = created_subgroups['Direct Expenses']
                elif any(x in lower_name for x in ['rent', 'salary', 'utility', 'bill', 'expense', 'discount allowed']):
                    acc.group = created_subgroups['Indirect Expenses']
                
                # Equity
                elif any(x in lower_name for x in ['capital', 'drawings', 'equity']):
                    acc.group = created_subgroups['Owners Equity']

                # Fallback based on old group type if not caught by name
                else:
                    if acc.group.group_type == 'asset':
                        acc.group = created_subgroups['Current Assets'] # Default
                    elif acc.group.group_type == 'income':
                        acc.group = created_subgroups['Direct Income'] # Default
                    elif acc.group.group_type == 'expense':
                        acc.group = created_subgroups['Indirect Expenses'] # Default
                    elif acc.group.group_type == 'liability':
                        acc.group = created_subgroups['Current Liabilities'] # Default
                    elif acc.group.group_type == 'equity':
                        acc.group = created_subgroups['Owners Equity'] # Default
                
                acc.save()

            # 4. Cleanup Old/Duplicate Groups
            # Delete valid top groups from potential delete list
            valid_ids = [g.id for g in top_groups.values()] + [g.id for g in created_subgroups.values()]
            
            # Find groups that are NOT in valid list and HAVE NO children/accounts
            # Actually, since we moved all accounts, we can try to delete all non-standard groups.
            # If they have subgroups we might need recursive check, but let's just delete leaf non-standard groups first.
            
            # Force cleanup of known bad names
            bad_groups = AccountGroup.objects.filter(company_uuid=company_uuid).exclude(id__in=valid_ids)
            for bg in bad_groups:
                # Only delete if empty to be safe, or just clear them since user asked to remove "baki gula"
                if not bg.accounts.exists() and not bg.subgroups.exists():
                     bg.delete()
                else:
                    # If it has stuff (maybe subgroups we missed moving), log it
                    # But we moved all accounts. So only issue is subgroups.
                    # Try to delete, it will fail if protected, or cascade. 
                    # Model says: parent -> on_delete=CASCADE. So deleting parent deletes keys.
                    # Accounts -> on_delete=PROTECT. So can't delete if accounts exist.
                    # Since we moved accounts, we should be able to delete.
                    try:
                        bg.delete()
                    except Exception as e:
                        self.stdout.write(f"Could not delete group {bg.name}: {e}")

