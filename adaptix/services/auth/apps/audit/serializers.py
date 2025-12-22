from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_id', 'username', 'company_uuid', 'service_name', 
            'path', 'method', 'status_code', 'ip', 'user_agent', 
            'request_body', 'response_body', 'payload_preview', 'created_at'
        ]
        read_only_fields = fields
