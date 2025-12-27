from rest_framework import serializers
from .models import EMIPlan, EMISchedule, EMIInstallment

class EMIPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = EMIPlan
        fields = '__all__'
        read_only_fields = ('company_uuid',)

class EMIInstallmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EMIInstallment
        fields = '__all__'

class EMIScheduleSerializer(serializers.ModelSerializer):
    installments = EMIInstallmentSerializer(many=True, read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)

    class Meta:
        model = EMISchedule
        fields = '__all__'

class CreateEMIScheduleSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    plan_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    customer_uuid = serializers.UUIDField(required=False, allow_null=True)
