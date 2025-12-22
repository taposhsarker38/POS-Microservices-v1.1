from rest_framework import serializers
from .models import Warehouse, Stock, Batch, StockTransaction, UOMConversion, StockSerial, BillOfMaterial

class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = '__all__'
        read_only_fields = ['company_uuid', 'is_deleted']

class BatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Batch
        fields = '__all__'

class StockSerialSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockSerial
        fields = '__all__'

class UOMConversionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UOMConversion
        fields = '__all__'

class BillOfMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillOfMaterial
        fields = '__all__'

class StockSerializer(serializers.ModelSerializer):
    batches = BatchSerializer(many=True, read_only=True)
    class Meta:
        model = Stock
        fields = '__all__'

class StockTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockTransaction
        fields = '__all__'

class StockAdjustmentSerializer(serializers.Serializer):
    warehouse_id = serializers.UUIDField(required=True)
    product_uuid = serializers.UUIDField(required=True)
    quantity = serializers.DecimalField(max_digits=20, decimal_places=3, required=True)
    type = serializers.ChoiceField(choices=[('add', 'Add'), ('sub', 'Subtract')], required=True)
    notes = serializers.CharField(required=False, allow_blank=True)
