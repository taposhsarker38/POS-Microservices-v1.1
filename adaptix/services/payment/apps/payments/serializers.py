from rest_framework import serializers
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ('id', 'status', 'stripe_charge_id', 'created_at', 'updated_at')

class ProcessPaymentSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField(max_length=3, default='USD')
    method = serializers.ChoiceField(choices=Payment.METHOD_CHOICES)
    
    # Card details (mock)
    card_number = serializers.CharField(required=False)
    expiry = serializers.CharField(required=False)
    cvc = serializers.CharField(required=False)
