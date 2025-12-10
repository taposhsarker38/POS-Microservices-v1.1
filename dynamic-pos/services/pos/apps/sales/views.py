from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Order, Payment, POSSession
from .serializers import OrderSerializer, PaymentSerializer, POSSessionSerializer
from .permissions import HasPermission
from .services import InventoryService

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [HasPermission]
    required_permission = "sales.order" # General permission for now

    def get_queryset(self):
        # Filter by company to ensure multi-tenancy isolation
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            qs = self.queryset.filter(company_uuid=uuid)
            
            # Additional Filters
            module = self.request.query_params.get('module_type')
            if module:
                qs = qs.filter(module_type=module)
                
            status_param = self.request.query_params.get('status')
            if status_param:
                qs = qs.filter(status=status_param)
                
            return qs
            
        return self.queryset.none()
    
    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        claims = getattr(self.request, "user_claims", {})
        user_id = claims.get("sub") or claims.get("user_id", "system")
        
        # Save Order
        order = serializer.save(company_uuid=uuid, created_by=user_id)
        
        # Trigger Inventory Deduction
        try:
            # We construct a dict or pass the object to helper
            # For simplicity, passing validated data structure or re-serializing
            # But order has items now.
            
            # Hack: Re-serialize to get clean dict with items
            data = OrderSerializer(order).data
            InventoryService.deduct_stock(data, uuid)
        except Exception as e:
            # Log error but don't block sale in this MVP. 
            # In Strict mode, we would rollback transaction.
            print(f"Inventory Sync Failed: {e}")

    @action(detail=False, methods=['post'], url_path='calculate')
    def calculate_totals(self, request):
        """
        Dry-run calculation for UI.
        Expects same payload as create (items list).
        Returns totals.
        """
        items = request.data.get('items', [])
        service_charge = float(request.data.get('service_charge', 0))
        
        grand_subtotal = 0
        grand_tax = 0
        grand_discount = 0
        
        detailed_items = []
        
        for item in items:
            qty = float(item.get('quantity', 1))
            price = float(item.get('unit_price', 0))
            disc = float(item.get('discount_amount', 0))
            tax = float(item.get('tax_amount', 0))
            
            subtotal = (qty * price) - disc + tax
            
            grand_subtotal += (qty * price)
            grand_tax += tax
            grand_discount += disc
            
            detailed_items.append({
                **item,
                'subtotal': subtotal
            })
            
        grand_total = grand_subtotal - grand_discount + grand_tax + service_charge
        
        return Response({
            "subtotal": grand_subtotal,
            "tax_total": grand_tax,
            "discount_total": grand_discount,
            "service_charge": service_charge,
            "grand_total": grand_total,
            "items": detailed_items
        })

class POSSessionViewSet(viewsets.ModelViewSet):
    queryset = POSSession.objects.all()
    serializer_class = POSSessionSerializer
    permission_classes = [HasPermission]
    required_permission = "sales.session"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        claims = getattr(self.request, "user_claims", {})
        user_uuid = claims.get("sub")
        
        serializer.save(company_uuid=uuid, user_uuid=user_uuid, status='open')

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        session = self.get_object()
        if session.status != 'open':
            return Response({"error": "Session is not open"}, status=400)
            
        closing_cash = request.data.get('closing_balance')
        session.closing_balance = closing_cash
        session.end_time = timezone.now()
        session.status = 'closed'
        session.save()
        return Response({"status": "closed"})

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [HasPermission]
    required_permission = "sales.payment"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        claims = getattr(self.request, "user_claims", {})
        user_id = claims.get("sub") or claims.get("user_id", "system")
        
        serializer.save(company_uuid=uuid, created_by=user_id)
        
        # Logic: Update Order payment status?
        # Ideally, use signals or service layer. For now, simple logic in save or signal.
        # I'll leave it basic CRUD for now.

