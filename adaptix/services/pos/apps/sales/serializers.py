from decimal import Decimal
from rest_framework import serializers
from .models import Order, OrderItem, Payment, POSSession, POSSettings, OrderReturn, ReturnItem

class POSSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = POSSession
        fields = '__all__'
        read_only_fields = ['company_uuid', 'status', 'opening_balance', 'closing_balance']

class POSSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = POSSettings
        fields = ['allow_partial_payment', 'allow_split_payment', 'default_tax_zone_code']
        

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
        fields = [
            'id', 'order', 'method', 'provider', 'amount', 
            'emi_plan', 'transaction_id', 'note', 'company_uuid', 'created_by'
        ]
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
            'status', 'payment_status', 'tax_zone_code',
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

        # -- CONFIG CHECK --
        settings = POSSettings.objects.filter(company_uuid=company_uuid).first()
        # Default to TRUE if no settings found (to not break existing behavior)
        allow_partial = settings.allow_partial_payment if settings else True
        allow_split = settings.allow_split_payment if settings else True

        if not allow_split and len(payments_data) > 1:
            raise serializers.ValidationError({"payment_data": "Split payments are disabled for this company."})

        # -- GUEST CUSTOMER CHECK --
        customer_uuid = validated_data.get('customer_uuid')
        is_guest = customer_uuid is None
        
        has_emi = any(p.get('method') == 'emi' for p in payments_data)
        if is_guest and has_emi:
            raise serializers.ValidationError({"payment_data": "Guest customers are not eligible for EMI sales. Please register/select a customer."})

        # Calculate total provided in payment_data
        total_payment_provided = sum(float(p.get('amount', 0)) for p in payments_data)
        
        # We need grand_total to check partial. But grand_total is calculated later. 
        # So we do a pre-calc or post-check. Post-check is safer inside atomic block but we can't rollback easily for logic error.
        # Let's do a quick pre-calc of grand_total
        pre_calc_total = 0
        pre_calc_tax = 0
        pre_calc_discount = 0
        
        # NOTE: This duplicates some logic but is necessary for validation BEFORE creating order if we want to be strict.
        # Or we can just let it create and then check.
        # Let's check logic:
        # If partial disabled, total_payment_provided MUST BE >= grand_total
        
        # ... logic continues inside transaction ...

        # ... logic continues inside transaction ...

        with transaction.atomic():
            order = Order.objects.create(**validated_data)
            
            # Initial status is pending/draft. It will be updated at the end.
            
            calculated_subtotal = Decimal('0')
            calculated_tax = Decimal('0')
            calculated_discount = Decimal('0')
            
            tax_zone_code = validated_data.get('tax_zone_code')
            
            for item_data in items_data:
                # Propagate company_uuid
                item_data['company_uuid'] = company_uuid
                
                qty = Decimal(str(item_data.get('quantity', 1)))
                price = Decimal(str(item_data.get('unit_price', 0)))
                disc = Decimal(str(item_data.get('discount_amount', 0)))
                tax = Decimal(str(item_data.get('tax_amount', 0)))
                
                # Dynamic Tax Calculation if zone provided and no tax sent by client
                is_exempt = item_data.get('metadata', {}).get('is_tax_exempt', False)
                
                if not is_exempt and tax_zone_code and tax == 0:
                    try:
                        from adaptix_core.service_registry import ServiceRegistry
                        url = f"{ServiceRegistry.get_api_url('accounting')}/tax/engine/calculate/"
                        payload = {
                            "amount": float(qty * price),
                            "zone_code": tax_zone_code,
                            "product_category_uuid": str(item_data.get('metadata', {}).get('category_uuid')) if item_data.get('metadata') else None
                        }
                        headers = {'X-Company-Id': str(company_uuid)}
                        resp = requests.post(url, json=payload, headers=headers)
                        if resp.status_code == 200:
                            tax_data = resp.json()
                            tax = Decimal(str(tax_data.get('total_tax', 0)))
                            item_data['tax_amount'] = tax
                    except Exception as e:
                        print(f"Tax Engine Error: {e}")
                elif is_exempt:
                    tax = Decimal('0')
                    item_data['tax_amount'] = tax

                # Simple server-side calc
                item_subtotal = (qty * price) - disc + tax
                item_data['subtotal'] = item_subtotal
                
                calculated_subtotal += (qty * price)
                calculated_tax += tax
                calculated_discount += disc
                
                OrderItem.objects.create(order=order, **item_data)
            
            # Loyalty Redemption Logic
            loyalty_discount = Decimal('0')
            if loyalty_action == 'REDEEM' and order.customer_uuid and redeemed_points > 0:
                try:
                    # 1. Deduct points from Customer Service
                    from adaptix_core.service_registry import ServiceRegistry
                    url = f"{ServiceRegistry.get_api_url('customer')}/customers/{order.customer_uuid}/adjust_points/"
                    resp = requests.post(url, json={'action': 'deduct', 'points': float(redeemed_points)})
                    
                    if resp.status_code == 200:
                        # 2. Apply Discount (1 Point = 1 Currency Unit for MVP)
                        loyalty_discount = Decimal(str(redeemed_points))
                        calculated_discount += loyalty_discount
                    else:
                        print(f"Failed to redeem points: {resp.text}")
                except Exception as e:
                    print(f"Loyalty error: {e}")

            # Update Order Totals
            order.subtotal = calculated_subtotal
            order.tax_total = calculated_tax
            order.discount_total = calculated_discount
            service = Decimal(str(validated_data.get('service_charge', 0)))
            
            order.grand_total = calculated_subtotal - calculated_discount + calculated_tax + service
            
            # Process Payments
            for p_data in payments_data:
                p_data['company_uuid'] = company_uuid
                p_data['created_by'] = created_by
                # Ensure emi_plan is handled (renamed if necessary between frontend/backend)
                if 'emi_plan' in p_data:
                    pass # already matches model
                elif 'emiPlanId' in p_data:
                    p_data['emi_plan'] = p_data.pop('emiPlanId')
                
                Payment.objects.create(order=order, **p_data)
                
            # Final Status Update (handled by signals but good to ensure grand_total consistency)
            order.update_payment_status()
            
            # -- VALIDATION CHECK (POST-CALCULATION) --
            if not allow_partial:
                # Refresh to get latest status
                if order.payment_status == 'partial':
                     raise serializers.ValidationError({
                         "payment_data": f"Partial payment is disabled. Total Due: {order.grand_total}, Paid: {order.paid_amount}"
                     })
            
            return order

class ReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='order_item.product_name', read_only=True)
    
    class Meta:
        model = OrderItem # Use wrapper logic if needed, but for creation we use ReturnItem
        fields = ['id', 'quantity', 'condition', 'product_name'] # Simplification
    
    # Actually we need a serializer for ReturnItem model
    
class ReturnItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnItem
        fields = ['order_item', 'quantity', 'condition']

class OrderReturnSerializer(serializers.ModelSerializer):
    items = ReturnItemCreateSerializer(many=True)
    
    class Meta:
        model = OrderReturn
        fields = ['id', 'return_number', 'order', 'status', 'refund_amount', 'reason', 'items', 'created_at']
        read_only_fields = ['return_number', 'status', 'created_at', 'company_uuid', 'created_by']

    def create(self, validated_data):
        from django.db import transaction
        
        items_data = validated_data.pop('items')
        
        # Context
        company_uuid = validated_data.get('company_uuid')
        created_by = validated_data.get('created_by')

        with transaction.atomic():
            return_request = OrderReturn.objects.create(**validated_data)
            
            total_refund = 0
            
            for item_data in items_data:
                order_item = item_data['order_item']
                qty = item_data['quantity']
                
                # Check Order Link
                if order_item.order_id != return_request.order_id:
                     raise serializers.ValidationError(f"Item {order_item.product_name} does not belong to this order.")
                
                # Basic refund calc (Unit Price - Discount per unit + Tax per unit) 
                # Handling "per unit" is tricky if discount was bulk. For MVP:
                unit_refund = (order_item.subtotal / order_item.quantity) # Average
                total_refund += (unit_refund * qty)
                
                ReturnItem.objects.create(return_request=return_request, **item_data)
            
            return_request.refund_amount = total_refund
            return_request.save()
            
            return return_request
