from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from .models import IoTDevice, Shelf, IoTReading
from .serializers import IoTDeviceSerializer, ShelfSerializer, IoTReadingSerializer

class ShelfViewSet(viewsets.ModelViewSet):
    queryset = Shelf.objects.all()
    serializer_class = ShelfSerializer
    
    def get_queryset(self):
        return self.queryset.filter(company_uuid=self.request.company_uuid)

    def perform_create(self, serializer):
        serializer.save(company_uuid=self.request.company_uuid)

class IoTDeviceViewSet(viewsets.ModelViewSet):
    queryset = IoTDevice.objects.all()
    serializer_class = IoTDeviceSerializer

    def get_queryset(self):
        return self.queryset.filter(company_uuid=self.request.company_uuid)

    def perform_create(self, serializer):
        serializer.save(company_uuid=self.request.company_uuid)

class IoTReadingListCreateView(generics.ListCreateAPIView):
    queryset = IoTReading.objects.all()
    serializer_class = IoTReadingSerializer
    
    def get_queryset(self):
        # Return readings for devices belonging to this company
        return self.queryset.filter(device__company_uuid=self.request.company_uuid)
