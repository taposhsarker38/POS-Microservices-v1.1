from rest_framework import serializers
from .models import Shift, EmployeeShift
from apps.employees.serializers import EmployeeSerializer # Using the existing one

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = [
            "id", "name", "code", "branch_type", "start_time", 
            "end_time", "grace_time_in", "grace_time_out", 
            "is_overnight", "created_at"
        ]
        read_only_fields = ['id', 'created_at']
        validators = [] # Disable UniqueTogetherValidator for company_uuid

    def validate(self, attrs):
        return attrs

class EmployeeShiftSerializer(serializers.ModelSerializer):
    shift_details = ShiftSerializer(source='shift', read_only=True)
    employee_name = serializers.CharField(source='employee.first_name', read_only=True)

    class Meta:
        model = EmployeeShift
        fields = [
            'id', 'employee', 'employee_name', 'shift', 'shift_details', 
            'start_date', 'end_date', 'assigned_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
        validators = []
