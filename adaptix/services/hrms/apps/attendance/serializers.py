from rest_framework import serializers
from .models import Attendance

class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'date', 'check_in', 'check_out', 
            'status', 'method', 'device_id', 'late_minutes', 
            'early_out_minutes', 'is_flexible', 'notes', 'created_at'
        ]
        read_only_fields = ('id', 'created_at', 'late_minutes', 'early_out_minutes')
