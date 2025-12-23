from django.core.management.base import BaseCommand
from apps.audit.models import AuditLog

class Command(BaseCommand):
    help = 'Verifies the integrity of the Blockchain Audit Ledger'

    def add_arguments(self, parser):
        parser.add_argument('--company', type=str, help='Company UUID to verify')

    def handle(self, *args, **options):
        company_uuid = options.get('company')
        
        queryset = AuditLog.objects.all().order_by('id')
        if company_uuid:
            queryset = queryset.filter(company_uuid=company_uuid)
            self.stdout.write(f"Verifying ledger for company: {company_uuid}")
        else:
            self.stdout.write("Verifying global ledger (grouped by company)...")

        valid_count = 0
        corrupted_count = 0
        
        # Track previous hash for each company independently
        last_hashes = {}

        for log in queryset:
            comp_id = log.company_uuid or "none"
            expected_prev_hash = last_hashes.get(comp_id, "0" * 64)
            
            is_valid = True
            reasons = []

            # 1. Check if the link to the previous record is intact
            actual_prev_hash = log.previous_hash or "0" * 64
            if actual_prev_hash != expected_prev_hash:
                is_valid = False
                reasons.append(f"Broken Chain: expected prev_hash {expected_prev_hash[:8]}..., got {actual_prev_hash[:8]}...")
            
            # 2. Check if the current data matches the recorded hash
            actual_hash = log.calculate_hash()
            recorded_hash = log.hash or "0" * 64
            if recorded_hash != actual_hash:
                is_valid = False
                reasons.append(f"Tampered Data: recorded hash {recorded_hash[:8]}... does not match calculated hash {actual_hash[:8]}...")
            
            if is_valid:
                valid_count += 1
            else:
                corrupted_count += 1
                self.stdout.write(self.style.ERROR(f"CRITICAL: AuditLog #{log.id} [{log.service_name}] is CORRUPTED! Reasons: {', '.join(reasons)}"))
            
            # Always update last_hashes with what is RECORDED in the DB to continue checking the chain
            last_hashes[comp_id] = recorded_hash

        if corrupted_count == 0:
            self.stdout.write(self.style.SUCCESS(f"✅ Ledger Integrity Verified. {valid_count} records checked and valid."))
        else:
            self.stdout.write(self.style.WARNING(f"⚠️ Ledger Verification Failed. Valid: {valid_count}, Corrupted: {corrupted_count}"))
