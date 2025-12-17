from rest_framework import serializers
from .models import KPI, EmployeeKPI, PerformanceReview, Promotion, Increment
from apps.employees.serializers import EmployeeSerializer

class KPISerializer(serializers.ModelSerializer):
    class Meta:
        model = KPI
        fields = '__all__'

class EmployeeKPISerializer(serializers.ModelSerializer):
    kpi_details = KPISerializer(source='kpi', read_only=True)
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)

    class Meta:
        model = EmployeeKPI
        fields = '__all__'

class PerformanceReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.get_full_name', read_only=True)
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)

    class Meta:
        model = PerformanceReview
        fields = '__all__'

class PromotionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    
    class Meta:
        model = Promotion
        fields = '__all__'

class IncrementSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)

    class Meta:
        model = Increment
        fields = '__all__'
