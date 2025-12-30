from rest_framework import serializers
from .models import PurchaseOrder, PurchaseOrderItem, RFQ, VendorQuote

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'
        read_only_fields = ('order', 'company_uuid')

class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, required=False)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ('company_uuid', 'reference_number')

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        # Generate reference number logic later or pass from frontend
        # For now simple auto-gen placeholder
        import uuid
        validated_data['reference_number'] = str(uuid.uuid4())[:10].upper()
        
        order = PurchaseOrder.objects.create(**validated_data)
        
        for item_data in items_data:
            PurchaseOrderItem.objects.create(order=order, **item_data, company_uuid=order.company_uuid)
            
        return order

class VendorQuoteSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    rfq_title = serializers.CharField(source='rfq.title', read_only=True)
    
    class Meta:
        model = VendorQuote
        fields = '__all__'
        read_only_fields = ('company_uuid', 'is_winning_quote')

class RFQSerializer(serializers.ModelSerializer):
    quotes = VendorQuoteSerializer(many=True, read_only=True)
    
    class Meta:
        model = RFQ
        fields = '__all__'
        read_only_fields = ('company_uuid', 'status', 'selected_quote')
