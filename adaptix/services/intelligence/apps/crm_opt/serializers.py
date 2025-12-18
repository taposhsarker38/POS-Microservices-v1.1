from rest_framework import serializers
from .models import CustomerSegmentation

class CustomerSegmentationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerSegmentation
        fields = '__all__'
