from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from ..models import Shipment, Vehicle, DeliveryRoute
from ..serializers import ShipmentSerializer # Assuming this exists, else will create
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

class RiderShipmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for Riders to view their assigned shipments and update status.
    """
    serializer_class = ShipmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        # Filter shipments where the rider is assigned to the route
        # This assumes the authenticated user is a driver/employee
        # For prototype, we might trust the query param or use a mock driver_uuid
        user_id = self.request.query_params.get('driver_uuid') 
        # In real app: user_id = self.request.user.employee_profile.id
        
        if not user_id:
            return Shipment.objects.none()
            
        return Shipment.objects.filter(
            route__driver_uuid=user_id,
            status__in=['SHIPPED', 'DELIVERED']
        ).order_by('route__start_time')

    @action(detail=True, methods=['post'], url_path='complete-delivery')
    def complete_delivery(self, request, pk=None):
        shipment = self.get_object()
        
        if shipment.status == 'DELIVERED':
             return Response({"detail": "Already delivered"}, status=status.HTTP_400_BAD_REQUEST)

        # Update fields
        if 'proof_of_delivery' in request.data:
            shipment.proof_of_delivery = request.data['proof_of_delivery']
        
        if 'signature' in request.data:
            shipment.signature = request.data['signature']
            
        if 'delivery_notes' in request.data:
            shipment.delivery_notes = request.data['delivery_notes']
            
        if 'geo_location' in request.data:
             shipment.geo_location = request.data['geo_location']

        shipment.status = 'DELIVERED'
        shipment.delivered_at = timezone.now()
        shipment.save()
        
        # Trigger sync with POS/Inventory (Mock for now)
        # In real system: send event to EventBus
        
        return Response(ShipmentSerializer(shipment).data)

    @action(detail=True, methods=['post'], url_path='fail-delivery')
    def fail_delivery(self, request, pk=None):
        shipment = self.get_object()
        shipment.status = 'RETURNED'
        shipment.delivery_notes = request.data.get('reason', 'Delivery failed')
        shipment.save()
        return Response(ShipmentSerializer(shipment).data)
