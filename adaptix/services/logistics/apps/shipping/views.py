from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Vehicle, Shipment, DeliveryRoute
from .serializers import VehicleSerializer, ShipmentSerializer, DeliveryRouteSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'driver_uuid']

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.all()
    serializer_class = ShipmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'order_uuid', 'route']

class DeliveryRouteViewSet(viewsets.ModelViewSet):
    queryset = DeliveryRoute.objects.all()
    serializer_class = DeliveryRouteSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'driver_uuid']
    
    @action(detail=True, methods=['post'])
    def assign_shipment(self, request, pk=None):
        route = self.get_object()
        shipment_id = request.data.get('shipment_id')
        if not shipment_id:
            return Response({'error': 'shipment_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shipment = Shipment.objects.get(pk=shipment_id)
            shipment.route = route
            shipment.status = 'SHIPPED'
            shipment.save()
            return Response({'status': 'assigned'})
        except Shipment.DoesNotExist:
            return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)
