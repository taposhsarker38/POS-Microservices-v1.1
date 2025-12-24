from rest_framework import serializers
from .models import Tax, TaxZone, TaxRule

class TaxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tax
        fields = '__all__'

class TaxZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxZone
        fields = '__all__'

class TaxRuleSerializer(serializers.ModelSerializer):
    tax_details = TaxSerializer(source='tax', read_only=True)
    
    class Meta:
        model = TaxRule
        fields = '__all__'

class TaxCalculationRequestSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    zone_code = serializers.CharField(max_length=50)
    product_category_uuid = serializers.UUIDField(required=False, allow_null=True)
