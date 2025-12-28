from rest_framework import serializers
from .models import Customer, AttributeSet, Attribute

class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute
        fields = '__all__'

class AttributeSetSerializer(serializers.ModelSerializer):
    attributes = AttributeSerializer(many=True, read_only=True)
    
    class Meta:
        model = AttributeSet
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'loyalty_points', 'tier', 'company_uuid', 'is_email_verified', 'is_phone_verified', 'email_otp', 'phone_otp')
