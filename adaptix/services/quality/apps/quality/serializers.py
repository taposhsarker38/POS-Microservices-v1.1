from rest_framework import serializers
from .models import QualityStandard, Inspection, TestResult

class QualityStandardSerializer(serializers.ModelSerializer):
    class Meta:
        model = QualityStandard
        fields = '__all__'

class TestResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestResult
        fields = '__all__'

class InspectionSerializer(serializers.ModelSerializer):
    results = TestResultSerializer(many=True, read_only=True)
    
    class Meta:
        model = Inspection
        fields = '__all__'
