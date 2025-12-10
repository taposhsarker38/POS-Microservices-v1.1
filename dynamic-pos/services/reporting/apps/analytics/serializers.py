from rest_framework import serializers
from .models import DailySales, TopProduct

class DailySalesSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySales
        fields = '__all__'

class TopProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopProduct
        fields = '__all__'
