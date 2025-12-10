from rest_framework import serializers
from .models import Order, OrderItem, Payment, POSSession

class POSSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = POSSession
        fields = '__all__'
        read_only_fields = ['company_uuid', 'status', 'opening_balance', 'closing_balance']

class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'item_type', 'product_uuid', 'product_name', 'sku', 
            'quantity', 'unit_price', 'subtotal', 'tax_amount', 'discount_amount',
            'start_time', 'end_time', 'assigned_staff_uuid',
            'variant_attributes', 'metadata'
        ]
    
    def validate(self, data):
        # Basic validation for rental items
        if data.get('item_type') == 'rental':
            if not data.get('start_time') or not data.get('end_time'):
                raise serializers.ValidationError({"start_time": "Required for rental items"})
        return data

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['company_uuid', 'created_by', 'order']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    payments = PaymentSerializer(many=True, read_only=True)
    session_id = serializers.PrimaryKeyRelatedField(
        queryset=POSSession.objects.all(), source='session', required=False, allow_null=True
    )
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'module_type', 'session_id',
            'customer_uuid', 'customer_name', 'customer_phone', 'customer_address',
            'table_number', 'token_number', 'delivery_date', 'pickup_date',
            'currency',
            'subtotal', 'tax_total', 'discount_total', 'service_charge', 'grand_total', 
            'paid_amount', 'due_amount',
            'status', 'payment_status',
            'metadata', 'created_at', 'updated_at', 'items', 'payments'
        ]
        read_only_fields = [
            'order_number', 'company_uuid', 'created_by', 
            'paid_amount', 'due_amount', 'subtotal', 'grand_total'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # company_uuid and created_by should be passed in save() from the view
        
        order = Order.objects.create(**validated_data)
        
        calculated_subtotal = 0
        calculated_tax = 0
        calculated_discount = 0
        
        for item_data in items_data:
            # Propagate company_uuid
            item_data['company_uuid'] = order.company_uuid
            
            qty = item_data.get('quantity', 1)
            price = item_data.get('unit_price', 0)
            disc = item_data.get('discount_amount', 0)
            tax = item_data.get('tax_amount', 0)
            
            # Simple server-side calc
            item_subtotal = (qty * price) - disc + tax
            item_data['subtotal'] = item_subtotal
            
            calculated_subtotal += (qty * price)
            calculated_tax += tax
            calculated_discount += disc
            
            OrderItem.objects.create(order=order, **item_data)
        
        # Update Order Totals
        order.subtotal = calculated_subtotal
        order.tax_total = calculated_tax
        order.discount_total = calculated_discount
        service = validated_data.get('service_charge', 0)
        
        order.grand_total = calculated_subtotal - calculated_discount + calculated_tax + service
        order.due_amount = order.grand_total
        order.save()
        
        return order
