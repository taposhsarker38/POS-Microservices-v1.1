from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PurchaseOrder, RFQ, VendorQuote, AIProcurementSuggestion
from .serializers import (
    PurchaseOrderSerializer, RFQSerializer, VendorQuoteSerializer,
    AIProcurementSuggestionSerializer
)
from adaptix_core.permissions import HasPermission
from adaptix_core.messaging import publish_event
import json

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [HasPermission]
    
    @property
    def required_permission(self):
        if self.action == 'my_vendor_orders':
            return None
        return "purchase.order"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()
    
    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=uuid)

    @action(detail=False, methods=['get'], url_path='my-vendor-orders')
    def my_vendor_orders(self, request):
        """Return POs for the logged-in vendor."""
        claims = getattr(request, 'user_claims', {})
        user_uuid = claims.get("sub")
        
        if not user_uuid:
            return Response({"error": "User identity not found"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            # We filter by vendor__user_uuid
            qs = self.get_queryset().filter(vendor__user_uuid=user_uuid)
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
        
        # Publish Event for Accounting
        try:
            event_payload = {
                "event": "purchase.order.received",
                "order_id": str(order.id),
                "reference": order.reference_number,
                "company_uuid": str(order.company_uuid),
                "wing_uuid": str(order.branch_id) if order.branch_id else None,
                "vendor_uuid": str(order.vendor.id),
                "total_amount": str(order.total_amount),
                "items": [
                    {
                        "product_uuid": str(item.product_uuid),
                        "quantity": str(item.quantity),
                        "unit_cost": str(item.unit_cost)
                    } for item in order.items.all()
                ]
            }
            publish_event("events", "purchase.order.received", event_payload)
        except Exception as e:
            print(f"Failed to publish purchase receipt event: {e}")
        
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
        
        # Publish Event for Accounting
        try:
            event_payload = {
                "event": "purchase.payment.recorded",
                "order_id": str(order.id),
                "reference": order.reference_number,
                "company_uuid": str(order.company_uuid),
                "wing_uuid": str(order.branch_id) if order.branch_id else None,
                "amount": str(amount),
                "method": method,
                "vendor_uuid": str(order.vendor.id)
            }
            publish_event("events", "purchase.payment.recorded", event_payload)
        except Exception as e:
            print(f"Failed to publish purchase payment event: {e}")
        
        return Response({
            "status": "success", 
            "paid_amount": order.paid_amount, 
            "payment_status": order.payment_status
        })

class RFQViewSet(viewsets.ModelViewSet):
    queryset = RFQ.objects.all()
    serializer_class = RFQSerializer
    permission_classes = [HasPermission]
    
    @property
    def required_permission(self):
        if self.action in ['list', 'retrieve', 'submit_quote']:
            return None
        return "purchase.order"

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
    
    @property
    def required_permission(self):
        if self.action == 'my_quotes':
            return None
        return "purchase.order"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=uuid)

    @action(detail=False, methods=['get'], url_path='my-quotes')
    def my_quotes(self, request):
        """Return quotes for the logged-in vendor."""
        claims = getattr(request, 'user_claims', {})
        user_uuid = claims.get("sub")
        
        if not user_uuid:
            return Response({"error": "User identity not found"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            qs = self.get_queryset().filter(vendor__user_uuid=user_uuid)
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AIProcurementSuggestionViewSet(viewsets.ModelViewSet):
    queryset = AIProcurementSuggestion.objects.all()
    serializer_class = AIProcurementSuggestionSerializer
    permission_classes = [HasPermission]
    required_permission = "purchase.order"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()

    @action(detail=True, methods=['post'], url_path='convert-to-po')
    def convert_to_po(self, request, pk=None):
        suggestion = self.get_object()
        if suggestion.status != 'pending':
            return Response({"detail": "Suggestion already processed"}, status=status.HTTP_400_BAD_REQUEST)
        
        vendor_id = request.data.get('vendor_id')
        if not vendor_id:
             return Response({"detail": "Vendor ID is required to create PO"}, status=status.HTTP_400_BAD_REQUEST)

        import uuid as uuid_lib
        from .models import PurchaseOrder, PurchaseOrderItem
        from django.utils import timezone
        
        # 1. Create the PO
        po = PurchaseOrder.objects.create(
            company_uuid=suggestion.company_uuid,
            vendor_id=vendor_id,
            reference_number=f"AI-{str(uuid_lib.uuid4())[:8].upper()}",
            status='draft',
            notes=f"Auto-generated from AI Suggestion. Reasoning: {suggestion.reasoning or 'Stockout risk detected.'}"
        )
        
        # 2. Add the item
        PurchaseOrderItem.objects.create(
            order=po,
            product_uuid=suggestion.product_uuid,
            quantity=suggestion.suggested_quantity,
            unit_cost=0, # Manager must update price in draft
            company_uuid=suggestion.company_uuid
        )
        
        # 3. Mark suggestion as approved
        suggestion.status = 'approved'
        suggestion.processed_at = timezone.now()
        suggestion.linked_po = po
        suggestion.save()
        
        return Response({
            "status": "approved",
            "po_id": str(po.id),
            "detail": "AI suggestion converted to a Draft Purchase Order."
        })
