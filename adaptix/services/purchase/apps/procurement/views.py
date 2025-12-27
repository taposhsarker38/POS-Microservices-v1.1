from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PurchaseOrder, RFQ, VendorQuote
from .serializers import PurchaseOrderSerializer, RFQSerializer, VendorQuoteSerializer
from adaptix_core.permissions import HasPermission
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
        
        if order.status != 'ordered': 
             return Response({"detail": "Order must be in 'ordered' state to receive"}, status=status.HTTP_400_BAD_REQUEST)
        
        warehouse_id = request.data.get('warehouse_id')
        if not warehouse_id:
             return Response({"detail": "Warehouse ID is required to receive stock"}, status=status.HTTP_400_BAD_REQUEST)

        # Trigger Inventory Update (Sync)
        # We process all items. If one fails, we should technically rollback, but for V1 we log errors.
        from .services import InventoryService
        
        errors = []
        token = request.headers.get('Authorization')
        
        for item in order.items.all():
            success = InventoryService.increase_stock(item, order.company_uuid, warehouse_id, token)
            if not success:
                errors.append(f"Failed to update stock for {item.product_uuid}")
        
        if errors:
             return Response({"detail": "Partial failure", "errors": errors}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        order.status = 'received'
        order.save()
        
        return Response({"status": "received", "id": order.id, "detail": "Stock updated successfully"})

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

    @action(detail=True, methods=['post'], url_path='record-payment')
    def record_payment(self, request, pk=None):
        order = self.get_object()
        
        amount = request.data.get('amount')
        method = request.data.get('method', 'bank_transfer')
        note = request.data.get('note', '')
        
        if not amount:
             return Response({"detail": "Amount is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount = float(amount)
        except ValueError:
            return Response({"detail": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
             return Response({"detail": "Amount must be positive"}, status=status.HTTP_400_BAD_REQUEST)

        # Update Order Stats
        order.paid_amount = float(order.paid_amount) + amount
        
        if order.paid_amount >= float(order.total_amount):
            order.payment_status = 'paid'
        elif order.paid_amount > 0:
            order.payment_status = 'active' # active/partial
        
        # If explicitly set to partial in model choices
        if order.paid_amount > 0 and order.paid_amount < float(order.total_amount):
             order.payment_status = 'partial'
             
        order.save()
        
        # Publish Event (Mocking for now, real implementation would use rabbitmq publisher)
        # from adaptix_core.messaging import publish_event
        # publish_event("purchase.payment.recorded", { ... })
        
        return Response({
            "status": "success", 
            "paid_amount": order.paid_amount, 
            "payment_status": order.payment_status
        })

class RFQViewSet(viewsets.ModelViewSet):
    queryset = RFQ.objects.all()
    serializer_class = RFQSerializer
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

    @action(detail=True, methods=['post'], url_path='select-winner')
    def select_winner(self, request, pk=None):
        from .services import RFQService
        po = RFQService.auto_select_winner(pk)
        if po:
            return Response({"status": "converted", "po_id": po.id})
        return Response({"detail": "Failed to auto-select winner or no quotes available"}, status=status.HTTP_400_BAD_REQUEST)

class VendorQuoteViewSet(viewsets.ModelViewSet):
    queryset = VendorQuote.objects.all()
    serializer_class = VendorQuoteSerializer
    permission_classes = [HasPermission]
    required_permission = "purchase.order" # Vendors will need a specific permission later, using this for now

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=uuid)
