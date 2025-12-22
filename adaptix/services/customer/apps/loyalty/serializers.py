from rest_framework import serializers
from .models import LoyaltyProgram, LoyaltyTier, LoyaltyAccount, LoyaltyTransaction

class LoyaltyTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyTier
        fields = ['id', 'name', 'min_points', 'multiplier']

class LoyaltyProgramSerializer(serializers.ModelSerializer):
    tiers = LoyaltyTierSerializer(many=True, read_only=True)
    
    class Meta:
        model = LoyaltyProgram
        fields = ['id', 'name', 'earn_rate', 'redemption_rate', 'is_active', 'target_audience', 'tiers']

class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyTransaction
        fields = ['id', 'transaction_type', 'points', 'description', 'reference_id', 'created_at']
        read_only_fields = ['created_at', 'created_by']

class LoyaltyAccountSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    tier_name = serializers.CharField(source='current_tier.name', read_only=True, allow_null=True)
    recent_transactions = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = LoyaltyAccount
        fields = ['id', 'customer', 'employee_uuid', 'balance', 'lifetime_points', 'program_name', 'tier_name', 'updated_at', 'recent_transactions', 'customer_name']
        read_only_fields = ['balance', 'lifetime_points']

    def validate(self, data):
        if not data.get('customer') and not data.get('employee_uuid'):
            raise serializers.ValidationError("Account must belong to either a Customer or an Employee.")
        if data.get('customer') and data.get('employee_uuid'):
            raise serializers.ValidationError("Account cannot belong to both Customer and Employee.")
        return data

    def get_recent_transactions(self, obj):
        txs = obj.transactions.all().order_by('-created_at')[:5]
        return LoyaltyTransactionSerializer(txs, many=True).data
