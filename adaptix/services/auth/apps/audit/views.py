from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer

class IsAdminUser(permissions.BasePermission):
    """
    Allocates access only to admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)

from rest_framework.decorators import action
from rest_framework.response import Response

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser] # Strict admin check
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    
    filterset_fields = {
        'user_id': ['exact'],
        'username': ['exact', 'icontains'],
        'service_name': ['exact'],
        'company_uuid': ['exact'],
        'method': ['exact'],
        'status_code': ['exact'],
        'created_at': ['gte', 'lte'],
    }
    search_fields = ['path', 'username', 'user_id']
    ordering_fields = ['created_at', 'status_code']
    ordering = ['-created_at']

    def get_queryset(self):
        # Allow superusers to see everything.
        # Use query params for filtering handled by filter_backends
        return self.queryset

    @action(detail=False, methods=['get'])
    def verify(self, request):
        """
        Lightweight integrity check for the ledger.
        Returns the count of valid/invalid records for the current tenant.
        """
        company_uuid = request.query_params.get('company_uuid')
        queryset = AuditLog.objects.all().order_by('id')
        if company_uuid:
            queryset = queryset.filter(company_uuid=company_uuid)
            
        # Optimization: only check the last 100 for a quick UI response
        # Full verification should be done via management command
        check_limit = 100
        logs = list(queryset.reverse()[:check_limit])
        logs.reverse() # back to chronological for chain check
        
        valid_count = 0
        corrupted_count = 0
        last_hash = None
        
        # We need the hash from the record BEFORE the batch to properly check the first one
        if logs:
            first_log = logs[0]
            prev_log = AuditLog.objects.filter(id__lt=first_log.id).order_by('-id').first()
            last_hash = prev_log.hash if prev_log else "0" * 64

        for log in logs:
            expected_prev = last_hash or "0" * 64
            actual_prev = log.previous_hash or "0" * 64
            actual_hash = log.calculate_hash()
            
            if actual_prev == expected_prev and log.hash == actual_hash:
                valid_count += 1
            else:
                corrupted_count += 1
            
            last_hash = log.hash

        return Response({
            "status": "compromised" if corrupted_count > 0 else "secure",
            "checked_records": len(logs),
            "valid": valid_count,
            "corrupted": corrupted_count,
            "total_records": queryset.count()
        })
