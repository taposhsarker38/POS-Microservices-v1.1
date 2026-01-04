from rest_framework import serializers
from .models import WorkCenter, BillOfMaterial, BOMItem, ProductionOrder, Operation, BOMOperation, ProductionOrderOperation, ProductUnit

class WorkCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkCenter
        fields = '__all__'
        read_only_fields = ['company_uuid', 'created_at', 'updated_at']

class OperationSerializer(serializers.ModelSerializer):
    work_center_name = serializers.CharField(source='work_center.name', read_only=True)
    class Meta:
        model = Operation
        fields = '__all__'
        read_only_fields = ['company_uuid', 'created_at', 'updated_at']

class BOMItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BOMItem
        fields = ['id', 'component_uuid', 'quantity', 'waste_percentage']

class BOMOperationSerializer(serializers.ModelSerializer):
    operation_name = serializers.CharField(source='operation.name', read_only=True)
    class Meta:
        model = BOMOperation
        fields = ['id', 'operation', 'operation_name', 'sequence', 'estimated_time_minutes']

class BillOfMaterialSerializer(serializers.ModelSerializer):
    items = BOMItemSerializer(many=True)
    operations = BOMOperationSerializer(many=True, required=False)

    class Meta:
        model = BillOfMaterial
        fields = ['id', 'product_uuid', 'name', 'quantity', 'version', 'is_active', 'items', 'operations', 'created_at']
        read_only_fields = ['company_uuid', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        operations_data = validated_data.pop('operations', [])
        bom = BillOfMaterial.objects.create(**validated_data)
        for item_data in items_data:
            BOMItem.objects.create(bom=bom, **item_data)
        for op_data in operations_data:
            BOMOperation.objects.create(bom=bom, **op_data)
        return bom
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        operations_data = validated_data.pop('operations', None)
        
        # Update BOM fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update Items
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                BOMItem.objects.create(bom=instance, **item_data)
                
        # Update Operations
        if operations_data is not None:
            instance.operations.all().delete()
            for op_data in operations_data:
                BOMOperation.objects.create(bom=instance, **op_data)
                
        return instance

class ProductionOrderOperationSerializer(serializers.ModelSerializer):
    operation_name = serializers.CharField(source='operation.name', read_only=True)
    class Meta:
        model = ProductionOrderOperation
        fields = '__all__'

class ProductUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductUnit
        fields = '__all__'

class ProductionOrderSerializer(serializers.ModelSerializer):
    bom_name = serializers.CharField(source='bom.name', read_only=True)
    work_center_name = serializers.CharField(source='work_center.name', read_only=True)
    work_center = serializers.PrimaryKeyRelatedField(queryset=WorkCenter.objects.all(), required=False, allow_null=True)
    operation_trackers = ProductionOrderOperationSerializer(many=True, read_only=True)
    units = ProductUnitSerializer(many=True, read_only=True)

    class Meta:
        model = ProductionOrder
        fields = '__all__'
        read_only_fields = ['company_uuid', 'created_by', 'created_at', 'updated_at', 'quantity_produced']
