from rest_framework import viewsets, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Order, Payment, POSSession, POSSettings, OrderReturn
from .serializers import OrderSerializer, PaymentSerializer, POSSessionSerializer, POSSettingsSerializer, OrderReturnSerializer
from adaptix_core.permissions import HasPermission
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
            qs = self.queryset.filter(company_uuid=uuid).select_related('session').prefetch_related('items', 'payments')
            
            # Additional Filters
            module = self.request.query_params.get('module_type')
            if module:
                qs = qs.filter(module_type=module)
                
            status_param = self.request.query_params.get('status')
            if status_param:
                qs = qs.filter(status=status_param)
            
            branch_id = self.request.query_params.get('branch_id')
            if branch_id:
                qs = qs.filter(branch_id=branch_id)
                
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            if start_date:
                qs = qs.filter(created_at__date__gte=start_date)
            if end_date:
                qs = qs.filter(created_at__date__lte=end_date)
                
            return qs
            
        return self.queryset.none()
    
    def perform_create(self, serializer):
        # Support fallback for tests where middleware might be disabled
        uuid = getattr(self.request, "company_uuid", None) or self.request.META.get('HTTP_X_COMPANY_UUID')
        claims = getattr(self.request, "user_claims", {})
        user_id = claims.get("sub") or claims.get("user_id", "system")
        
        # Save Order
        order = serializer.save(company_uuid=uuid, created_by=user_id)
        
        # Trigger Inventory Deduction
        try:
            # Hack: Re-serialize to get clean dict with items
            data = OrderSerializer(order).data
            # Pass order ID for tracking reason
            InventoryService.deduct_stock(data, order.id)
            
            # Publish Event for Accounting (Zero-Touch)
            try:
                from adaptix_core.messaging import publish_event
                from django.core.serializers.json import DjangoJSONEncoder
                import json
                
                event_payload = {
                    "event": "pos.sale.closed",
                    "order_id": str(order.id),
                    "order_number": order.order_number,
                    "company_uuid": str(order.company_uuid),
                    "wing_uuid": str(order.branch_id) if order.branch_id else None,
                    "grand_total": str(order.grand_total),
                    "items": data.get("items", []),
                    "created_at": order.created_at.isoformat(),
                    "payment_details": data.get("payments", []),
                    "customer_uuid": str(order.customer_uuid) if order.customer_uuid else None
                }
                
                # Use shared utility which uses correct settings/env
                publish_event("events", "pos.sale.closed", event_payload)
                
            except Exception as pub_error:
                print(f"Failed to publish accounting event: {pub_error}")

        except Exception as e:
            # Log error but don't block sale in this MVP. 
            # In Strict mode, we would rollback transaction.
            print(f"Inventory Sync Failed: {e}")

    @action(detail=True, methods=['post'], url_path='request-production')
    def request_production(self, request, pk=None):
        """
        Manually trigger a production request for this order.
        Expects: {'items': [{'product_uuid': '...', 'quantity': 100}, ...]}
        If items not provided, requests production for all items in the order.
        """
        order = self.get_object()
        requested_items = request.data.get('items')
        
        from adaptix_core.messaging import publish_event
        from django.core.serializers.json import DjangoJSONEncoder
        import json
        
        results = []
        
        # If no specific items provided, use all items in order
        items_to_process = []
        if not requested_items:
            for item in order.items.all():
                items_to_process.append({
                    "product_uuid": str(item.product_uuid),
                    "quantity": float(item.quantity)
                })
        else:
            items_to_process = requested_items

        for item in items_to_process:
            p_uuid = item.get('product_uuid')
            qty = item.get('quantity')
            
            event_payload = {
                "event": "sales.production_requested",
                "order_uuid": str(order.id),
                "order_number": order.order_number,
                "product_uuid": p_uuid,
                "quantity": qty,
                "company_uuid": str(order.company_uuid),
                "requested_by": str(request.user.id) if request.user.is_authenticated else "system"
            }
            
            try:
                publish_event("events", "sales.production_requested", event_payload)
                results.append({"product_uuid": p_uuid, "status": "sent"})
            except Exception as e:
                results.append({"product_uuid": p_uuid, "status": "failed", "error": str(e)})
                
        return Response({"order_number": order.order_number, "results": results})

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
            return self.queryset.filter(company_uuid=uuid).select_related('order')
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        claims = getattr(self.request, "user_claims", {})
        user_id = claims.get("sub") or claims.get("user_id", "system")
        
        serializer.save(company_uuid=uuid, created_by=user_id)
        
        # Logic: Update Order payment status?
        # Ideally, use signals or service layer. For now, simple logic in save or signal.
        # I'll leave it basic CRUD for now.


class POSSettingsViewSet(viewsets.ModelViewSet):
    queryset = POSSettings.objects.all()
    serializer_class = POSSettingsSerializer
    permission_classes = [HasPermission]
    required_permission = "sales.settings"
    
    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        # Ensure only one settings object per company
        if POSSettings.objects.filter(company_uuid=uuid).exists():
            raise serializers.ValidationError("Settings already exist for this company.")
        serializer.save(company_uuid=uuid)

class OrderReturnViewSet(viewsets.ModelViewSet):
    queryset = OrderReturn.objects.all()
    serializer_class = OrderReturnSerializer
    permission_classes = [HasPermission]
    required_permission = "sales.return"
    
    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid).prefetch_related('items')
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        claims = getattr(self.request, "user_claims", {})
        user_id = claims.get("sub")
        
        order_return = serializer.save(company_uuid=uuid, created_by=user_id)
        
        # Publish Event for Reporting/Analytics
        try:
            from adaptix_core.messaging import publish_event
            
            event_payload = {
                "event": "pos.return.created",
                "return_id": str(order_return.id),
                "order_id": str(order_return.order.id),
                "order_number": order_return.order.order_number,
                "company_uuid": str(order_return.company_uuid),
                "wing_uuid": str(order_return.order.branch_id) if order_return.order.branch_id else None,
                "refund_amount": str(order_return.refund_amount),
                "created_at": order_return.created_at.isoformat(),
                "items": [
                    {
                        "product_name": item.product_name,
                        "quantity": str(item.quantity),
                        "reason": item.reason,
                        "condition": item.condition
                    } for item in order_return.items.all()
                ]
            }
            
            publish_event("events", "pos.return.created", event_payload)
            print(f"Published pos.return.created event for Order: {order_return.order.order_number}")
            
        except Exception as pub_error:
            print(f"Failed to publish return event: {pub_error}")
