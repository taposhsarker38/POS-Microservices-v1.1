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
