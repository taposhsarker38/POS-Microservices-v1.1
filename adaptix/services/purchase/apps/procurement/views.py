from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PurchaseOrder
from .serializers import PurchaseOrderSerializer
from apps.utils.permissions import HasPermission
# Service integration import later

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [HasPermission]
    required_permission = "purchase.order"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()
    
    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=uuid)

    @action(detail=True, methods=['post'], url_path='receive')
    def receive_order(self, request, pk=None):
        order = self.get_object()
        if order.status == 'received':
            return Response({"detail": "Order already received"}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = 'received'
        order.save()
        
        if order.status != 'ordered': # and status != 'processing' ?
             return Response({"detail": "Order must be in 'ordered' state to receive"}, status=status.HTTP_400_BAD_REQUEST)

        # Set provisional status
        order.status = 'processing'
        order.save()
        
        # Trigger Inventory Update (Async)
        from .services import InventoryService
        for item in order.items.all():
            InventoryService.increase_stock(item, order.company_uuid)
        
        return Response({"status": "processing", "id": order.id, "detail": "Inventory update initiated"})

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_order(self, request, pk=None):
        order = self.get_object()
        
        # In a real app, verify permission logic here 
        # e.g. if request.user.role != 'manager': raise PermissionDenied
        
        from django.utils import timezone
        
        if order.status != 'draft' and order.status != 'pending_approval':
             return Response({"detail": "Order not in valid state for approval"}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'approved'
        order.approval_status = 'approved'
        order.approved_by = getattr(request, 'user_claims', {}).get('user_id', 'unknown')
        order.approved_at = timezone.now()
        order.save()
        
        # Notify
        from apps.utils.notifications import NotificationService
        notify = NotificationService()
        notify.send_notification(
            event_type="purchase.order.approved",
            data={
                "order_id": str(order.id),
                "reference": order.reference_number,
                "approved_by": order.approved_by,
                "amount": float(order.total_amount)
            },
            rooms=[str(order.company_uuid)]
        )
        
        return Response({"status": "approved", "id": order.id})
