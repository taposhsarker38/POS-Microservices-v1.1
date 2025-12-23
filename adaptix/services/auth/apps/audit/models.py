import hashlib
import json
from django.db import models, transaction
from django.conf import settings

class AuditLogManager(models.Manager):
    def create_with_ledger(self, **kwargs):
        """
        Creates an AuditLog entry and links it to the previous one via hash-chain.
        Ensures atomicity and sequential integrity.
        """
        company_uuid = kwargs.get('company_uuid')
        # Use a transaction block to ensure the lock is held only for the minimum time
        with transaction.atomic():
            # Query for the last record for this company with a non-blocking lock.
            # If another request is currently appending to this company's chain, 
            # we will fail fast rather than hanging the worker.
            try:
                last_log = self.select_for_update(of=('self',), nowait=True).filter(
                    company_uuid=company_uuid
                ).order_by('-id').first()
            except Exception as e:
                # If locked, we could potentially retry or skip. 
                # For now, let's log and re-raise to see the impact.
                print(f"DEBUG LEDGER: Lock busy for company {company_uuid}: {e}")
                # Fallback: if we can't lock the chain, we might have to wait or fail.
                # To prevent hanging the service, we'll re-raise as a distinct error.
                raise Exception(f"Ledger lock busy: {e}")

            prev_hash = last_log.hash if last_log and last_log.hash else "0" * 64
            
            instance = self.model(**kwargs)
            instance.previous_hash = prev_hash
            instance.save() 
            
            instance.hash = instance.calculate_hash()
            instance.save(update_fields=['hash'])
            return instance

class AuditLog(models.Model):
    objects = AuditLogManager()
    user_id = models.CharField(max_length=255, null=True, blank=True)
    username = models.CharField(max_length=255, null=True, blank=True)
    company_uuid = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    service_name = models.CharField(max_length=100, default='unknown')
    path = models.CharField(max_length=400)
    method = models.CharField(max_length=10)
    status_code = models.PositiveSmallIntegerField()
    request_body = models.TextField(blank=True)
    payload_preview = models.JSONField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    ip = models.CharField(max_length=64, blank=True, null=True)
    user_agent = models.CharField(max_length=512, blank=True, null=True)
    
    # Blockchain Audit Ledger fields
    previous_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    hash = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def calculate_hash(self):
        """
        Calculates the SHA-256 hash of the log entry.
        Note: We exclude 'hash' itself. 'created_at' must be set.
        """
        data = {
            'user_id': str(self.user_id),
            'company_uuid': str(self.company_uuid),
            'service_name': self.service_name,
            'path': self.path,
            'method': self.method,
            'status_code': self.status_code,
            'request_body': self.request_body,
            'response_body': self.response_body,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'previous_hash': self.previous_hash or "0" * 64
        }
        encoded_data = json.dumps(data, sort_keys=True).encode()
        return hashlib.sha256(encoded_data).hexdigest()

    def __str__(self):
        return f"[{self.service_name}] {self.method} {self.path} - {self.status_code}"
