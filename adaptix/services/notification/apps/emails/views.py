from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import SMTPSettings
from .serializers import SMTPSettingsSerializer
import secrets

class SMTPSettingsViewSet(viewsets.ModelViewSet):
    queryset = SMTPSettings.objects.all()
    serializer_class = SMTPSettingsSerializer
    # permission_classes = [permissions.IsAuthenticated] # Enable in prod

    def get_queryset(self):
        # Filter by company from context (middleware)
        if hasattr(self.request, 'company_uuid'):
             return self.queryset.filter(company_uuid=self.request.company_uuid)
        return self.queryset

    def create(self, request, *args, **kwargs):
        # Ensure company_uuid is set (simulate one if missing for now or use middleware)
        company_uuid = getattr(request, 'company_uuid', None)
        
        # Fallback for dev without Kong/Auth
        if not company_uuid:
             # Use a fixed UUID for "default" tenant in dev mode if header missing
             company_uuid = "00000000-0000-0000-0000-000000000000"

        # Check if exists
        instance = SMTPSettings.objects.filter(company_uuid=company_uuid).first()
        
        data = request.data.copy()
        data['company_uuid'] = company_uuid

        if instance:
            serializer = self.get_serializer(instance, data=data, partial=True)
        else:
            serializer = self.get_serializer(data=data)

        serializer.is_valid(raise_exception=True)
        serializer.save(company_uuid=company_uuid)
        return Response(serializer.data, status=status.HTTP_200_OK)
