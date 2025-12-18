from rest_framework import serializers
from .models import InventoryOptimization

class InventoryOptimizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryOptimization
        fields = '__all__'
