from rest_framework import serializers
from .models import Forecast, SalesHistory

class ForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = Forecast
        fields = '__all__'

class SalesHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesHistory
        fields = '__all__'
