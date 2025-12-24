from rest_framework import serializers, viewsets
from .models import Employee, AttributeSet, Attribute

class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute
        fields = '__all__'

class AttributeSetSerializer(serializers.ModelSerializer):
    attributes = AttributeSerializer(many=True, read_only=True)
    
    class Meta:
        model = AttributeSet
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = [
            'id', 'company_uuid', 'user_uuid', 'employee_code', 'first_name', 
            'last_name', 'email', 'phone', 'gender', 'department', 
            'designation', 'reporting_to', 'joining_date', 'salary_basic', 
            'is_active', 'created_at', 'branch_uuid', 'current_shift', 
            'attendance_policy', 'attribute_set', 'attributes'
        ]
        read_only_fields = ('id', 'created_at', 'company_uuid')
