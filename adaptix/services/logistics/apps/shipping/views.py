from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Vehicle, Shipment, DeliveryRoute
from .serializers import VehicleSerializer, ShipmentSerializer, DeliveryRouteSerializer

from adaptix_core.permissions import HasPermission

class BaseLogisticsViewSet(viewsets.ModelViewSet):
    permission_classes = [HasPermission]
    
    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()

    def perform_create(self, serializer):
        serializer.save(
            company_uuid=getattr(self.request, "company_uuid", None),
            branch_id=getattr(self.request, "branch_id", None)
        )

class VehicleViewSet(BaseLogisticsViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    required_permission = "logistics.fleet"
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'driver_uuid']

class ShipmentViewSet(BaseLogisticsViewSet):
    queryset = Shipment.objects.all()
    serializer_class = ShipmentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'order_uuid', 'route']

    @property
    def required_permission(self):
        if self.action in ['my_tasks', 'complete_delivery']:
            return None # Rider access
        return "logistics.shipment"

    @action(detail=False, methods=['get'], url_path='my-tasks')
    def my_tasks(self):
        """Assigned tasks for the logged-in rider."""
        claims = getattr(self.request, 'user_claims', {})
        user_uuid = claims.get("sub")
        
        if not user_uuid:
            return Response({"error": "Identity not found"}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Shipments assigned to a route where this user is the driver
        qs = self.get_queryset().filter(route__driver_uuid=user_uuid).exclude(status__in=['DELIVERED', 'RETURNED'])
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='complete-delivery')
    def complete_delivery(self, request, pk=None):
        shipment = self.get_object()
        
        shipment.status = 'DELIVERED'
        shipment.delivery_notes = request.data.get('notes')
        shipment.geo_location = request.data.get('location') # Expected JSON {'lat':..., 'lng':...}
        shipment.proof_of_delivery = request.FILES.get('pod')
        shipment.signature = request.FILES.get('signature')
        
        from django.utils import timezone
        shipment.delivered_at = timezone.now()
        shipment.save()
        
        return Response({'status': 'delivered', 'tracking_number': shipment.tracking_number})

class DeliveryRouteViewSet(BaseLogisticsViewSet):
    queryset = DeliveryRoute.objects.all()
    serializer_class = DeliveryRouteSerializer
    required_permission = "logistics.route"
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'driver_uuid']
    
    @action(detail=True, methods=['post'])
    def assign_shipment(self, request, pk=None):
        route = self.get_object()
        shipment_id = request.data.get('shipment_id')
        if not shipment_id:
            return Response({'error': 'shipment_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shipment = Shipment.objects.get(pk=shipment_id, company_uuid=route.company_uuid)
            shipment.route = route
            shipment.status = 'SHIPPED'
            shipment.save()
            return Response({'status': 'assigned'})
        except Shipment.DoesNotExist:
            return Response({'error': 'Shipment not found'}, status=status.HTTP_404_NOT_FOUND)
