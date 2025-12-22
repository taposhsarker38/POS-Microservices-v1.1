from rest_framework import serializers
from .models import WorkCenter, BillOfMaterial, BOMItem, ProductionOrder

class WorkCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkCenter
        fields = '__all__'
        read_only_fields = ['company_uuid', 'created_at', 'updated_at']

class BOMItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BOMItem
        fields = ['id', 'component_uuid', 'quantity', 'waste_percentage']

class BillOfMaterialSerializer(serializers.ModelSerializer):
    items = BOMItemSerializer(many=True)

    class Meta:
        model = BillOfMaterial
        fields = ['id', 'product_uuid', 'name', 'quantity', 'version', 'is_active', 'items', 'created_at']
        read_only_fields = ['company_uuid', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        bom = BillOfMaterial.objects.create(**validated_data)
        for item_data in items_data:
            BOMItem.objects.create(bom=bom, **item_data)
        return bom
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # Update BOM fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update Items (Delete all and recreate for simplicity in MVP)
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                BOMItem.objects.create(bom=instance, **item_data)
                
        return instance

class ProductionOrderSerializer(serializers.ModelSerializer):
    bom_name = serializers.CharField(source='bom.name', read_only=True)
    work_center_name = serializers.CharField(source='work_center.name', read_only=True)

    class Meta:
        model = ProductionOrder
        fields = '__all__'
        read_only_fields = ['company_uuid', 'created_by', 'created_at', 'updated_at', 'quantity_produced']
