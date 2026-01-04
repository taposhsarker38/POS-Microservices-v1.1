from rest_framework import serializers
from .models import QualityStandard, Inspection, TestResult, DefectCategory, InspectionPhoto

class DefectCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DefectCategory
        fields = '__all__'

class InspectionPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionPhoto
        fields = '__all__'

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
    photos = InspectionPhotoSerializer(many=True, read_only=True)
    defect_category_name = serializers.ReadOnlyField(source='defect_category.name')
    
    class Meta:
        model = Inspection
        fields = '__all__'
