from rest_framework import serializers
from .models import IoTDevice, IoTReading, Shelf

class ShelfSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shelf
        fields = '__all__'
        read_only_fields = ('company_uuid',)

class IoTDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = IoTDevice
        fields = '__all__'
        read_only_fields = ('company_uuid',)

class IoTReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = IoTReading
        fields = ('id', 'device', 'value', 'unit', 'timestamp', 'metadata')
        read_only_fields = ('timestamp',)

    def create(self, validated_data):
        # Ensure device exists and belongs to company? 
        # Check happens in permission classes usually, or we trust the API key.
        # For this internal microservice, we assume auth handled by Gateway/Middleware.
        return super().create(validated_data)
