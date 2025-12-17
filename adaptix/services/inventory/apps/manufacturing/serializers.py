from rest_framework import serializers
from .models import WorkCenter, BillOfMaterial, BOMItem, ProductionOrder

class WorkCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkCenter
        fields = '__all__'

class BOMItemSerializer(serializers.ModelSerializer):
    # Frontend can resolve product name using component_uuid
    class Meta:
        model = BOMItem
        fields = '__all__'

class BillOfMaterialSerializer(serializers.ModelSerializer):
    items = BOMItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = BillOfMaterial
        fields = '__all__'

class ProductionOrderSerializer(serializers.ModelSerializer):
    work_center_name = serializers.CharField(source='work_center.name', read_only=True)
    bom_name = serializers.CharField(source='bom.name', read_only=True)

    class Meta:
        model = ProductionOrder
        fields = '__all__'
