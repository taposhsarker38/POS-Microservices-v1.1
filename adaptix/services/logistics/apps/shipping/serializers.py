from rest_framework import serializers
from .models import Vehicle, Shipment, DeliveryRoute

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'

class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = '__all__'
        read_only_fields = ['tracking_number', 'created_at', 'updated_at']

class DeliveryRouteSerializer(serializers.ModelSerializer):
    shipments = ShipmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = DeliveryRoute
        fields = '__all__'
