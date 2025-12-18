from rest_framework import serializers
from .models import SalesForecast

class SalesForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesForecast
        fields = '__all__'
