from rest_framework import viewsets
from .models import Vendor
from .serializers import VendorSerializer
from apps.utils.permissions import HasPermission

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [HasPermission]
    required_permission = "purchase.vendor"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()
    
    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=uuid)
