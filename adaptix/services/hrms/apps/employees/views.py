from rest_framework import serializers
from .models import Employee, Department, Designation
from .serializers import EmployeeSerializer
from config.base_views import BaseCompanyViewSet


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'
        read_only_fields = ['company_uuid']  # Auto-injected


class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = '__all__'
        read_only_fields = ['company_uuid']  # Auto-injected


class DepartmentViewSet(BaseCompanyViewSet):
    """Department management with auto company filtering."""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    required_permission = 'hrms.department'


class DesignationViewSet(BaseCompanyViewSet):
    """Designation management with auto company filtering."""
    queryset = Designation.objects.all()
    serializer_class = DesignationSerializer
    required_permission = 'hrms.designation'


class EmployeeViewSet(BaseCompanyViewSet):
    """Employee management with auto company filtering."""
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    required_permission = 'hrms.employee'
