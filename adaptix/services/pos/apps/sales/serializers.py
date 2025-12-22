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
    loyalty_action = serializers.ChoiceField(
        choices=['EARN', 'REDEEM', 'NONE'], 
        default='NONE', 
        write_only=True
    )
    redeemed_points = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, write_only=True
    )
    payment_data = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True
    )

    wing = serializers.UUIDField(source='branch_id', required=False, allow_null=True)

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
            'metadata', 'created_at', 'updated_at', 'items', 'payments', 'payment_data',
            'loyalty_action', 'redeemed_points', 'wing'
        ]
        read_only_fields = [
            'order_number', 'company_uuid', 'created_by', 
            'paid_amount', 'due_amount', 'subtotal', 'grand_total'
        ]

    def create(self, validated_data):
        import requests
        from django.db import transaction
        
        items_data = validated_data.pop('items')
        payments_data = validated_data.pop('payment_data', [])
        loyalty_action = validated_data.pop('loyalty_action', 'NONE')
        redeemed_points = validated_data.pop('redeemed_points', 0)
        
        # Extract Context (Injected by perform_create in View)
        company_uuid = validated_data.get('company_uuid')
        created_by = validated_data.get('created_by')

        if not company_uuid:
            raise serializers.ValidationError("Missing context: company_uuid")

        with transaction.atomic():
            order = Order.objects.create(**validated_data)
            
            calculated_subtotal = 0
            calculated_tax = 0
            calculated_discount = 0
            
            for item_data in items_data:
                # Propagate company_uuid
                item_data['company_uuid'] = company_uuid
                
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
            
            # Loyalty Redemption Logic
            loyalty_discount = 0
            if loyalty_action == 'REDEEM' and order.customer_uuid and redeemed_points > 0:
                try:
                    # 1. Deduct points from Customer Service
                    from adaptix_core.service_registry import ServiceRegistry
                    url = f"{ServiceRegistry.get_api_url('customer')}/customers/{order.customer_uuid}/adjust_points/"
                    resp = requests.post(url, json={'action': 'deduct', 'points': float(redeemed_points)})
                    
                    if resp.status_code == 200:
                        # 2. Apply Discount (1 Point = 1 Currency Unit for MVP)
                        loyalty_discount = float(redeemed_points)
                        calculated_discount += loyalty_discount
                    else:
                        print(f"Failed to redeem points: {resp.text}")
                except Exception as e:
                    print(f"Loyalty error: {e}")

            # Update Order Totals
            order.subtotal = calculated_subtotal
            order.tax_total = calculated_tax
            order.discount_total = calculated_discount
            service = validated_data.get('service_charge', 0)
            
            order.grand_total = calculated_subtotal - calculated_discount + calculated_tax + service
            
            # Process Payments
            total_paid = 0
            for p_data in payments_data:
                p_data['company_uuid'] = company_uuid
                p_data['created_by'] = created_by
                Payment.objects.create(order=order, **p_data)
                total_paid += float(p_data.get('amount', 0))
                
            order.paid_amount = total_paid
            order.due_amount = float(order.grand_total) - total_paid
            
            if order.due_amount <= 0:
                order.payment_status = 'paid'
            elif total_paid > 0:
                order.payment_status = 'partial'
            else:
                order.payment_status = 'pending'
                
            order.save()
            
            
            return order
