from rest_framework import viewsets
from .models import WorkCenter, BillOfMaterial, ProductionOrder
from .serializers import WorkCenterSerializer, BillOfMaterialSerializer, ProductionOrderSerializer
from adaptix_core.permissions import HasPermission
import os
import json
from kombu import Connection, Exchange, Producer
from django.core.serializers.json import DjangoJSONEncoder

class WorkCenterViewSet(viewsets.ModelViewSet):
    queryset = WorkCenter.objects.all()
    serializer_class = WorkCenterSerializer
    permission_classes = [HasPermission]
    required_permission = "mrp.work_center"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()
    
    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=uuid)

class BillOfMaterialViewSet(viewsets.ModelViewSet):
    queryset = BillOfMaterial.objects.all()
    serializer_class = BillOfMaterialSerializer
    permission_classes = [HasPermission]
    required_permission = "mrp.bom"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid).prefetch_related('items')
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=uuid)

class ProductionOrderViewSet(viewsets.ModelViewSet):
    queryset = ProductionOrder.objects.all()
    serializer_class = ProductionOrderSerializer
    permission_classes = [HasPermission]
    required_permission = "mrp.order"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid).select_related('bom', 'work_center')
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        claims = getattr(self.request, "user_claims", {})
        user_id = claims.get("sub")
        serializer.save(company_uuid=uuid, created_by=user_id)

    def perform_update(self, serializer):
        instance = serializer.instance
        old_status = instance.status
        updated_instance = serializer.save()
        new_status = updated_instance.status
        
        # Trigger QC Event if moved to QUALITY_CHECK
        if old_status != 'QUALITY_CHECK' and new_status == 'QUALITY_CHECK':
            self.publish_qc_event(updated_instance)
        
        # Trigger Material Deduction if moved to IN_PROGRESS
        if old_status != 'IN_PROGRESS' and new_status == 'IN_PROGRESS':
            self.publish_consumption_event(updated_instance)

    def publish_qc_event(self, order):
        try:
            BROKER_URL = os.environ.get("RABBITMQ_URL", "amqp://adaptix:adaptix123@rabbitmq:5672/")
            connection = Connection(BROKER_URL)
            connection.connect()
            
            exchange = Exchange("events", type="topic", durable=True)
            producer = Producer(connection)
            
            event_payload = {
                "event": "production.qc_requested",
                "order_id": str(order.id),
                "product_uuid": str(order.product_uuid),
                "quantity": float(order.quantity_planned),
                "company_uuid": str(order.company_uuid),
                "source": "manufacturing",
                "reference_type": "PRODUCTION",
                "reference_uuid": str(order.uuid) 
            }
            
            # Since Quality Service expects UUID reference, and ProductionOrder uses Integer ID by default Django,
            # We might have a mismatch if Inspection model strictly requires UUID.
            # Let's check Inspection model again.
            # It has `reference_uuid = models.UUIDField`.
            # Ah, ProductionOrder.id is likely BigAuto (Integer).
            # WE HAVE A PROBLEM. ProductionOrder does not have a UUID primary key or public UUID field?
            # Let's check the model definition.
            
            # If ProductionOrder doesn't have a UUID, I should generate one or use a hash.
            # Wait, `ProductionOrder` model I created:
            # `class ProductionOrder(models.Model):` -> Default AutoField (Integer)
            
            # The Quality Service `Inspection` requires `reference_uuid`.
            # I must fix this. Either change Quality Service to accept String/Int or add a UUID to ProductionOrder.
            # Adding a UUID to ProductionOrder is better for distributed systems.
            pass # Placeholder
            
            producer.publish(
                json.dumps(event_payload, cls=DjangoJSONEncoder),
                exchange=exchange,
                routing_key="production.qc_requested",
                declare=[exchange],
                retry=True
            )
            connection.release()
            print(f"Published production.qc_requested event for Order {order.id}")
            
        except Exception as e:
            print(f"Failed to publish QC event: {e}")

    def publish_consumption_event(self, order):
        try:
            if not order.bom:
                print("No BOM for order, skipping consumption.")
                return

            items = []
            # Calculate total quantity needed (Order Qty * BOM component qty)
            for item in order.bom.items.all():
                needed = float(item.quantity) * float(order.quantity_planned)
                items.append({
                    "component_uuid": str(item.component_uuid),
                    "quantity": needed
                })

            BROKER_URL = os.environ.get("RABBITMQ_URL", "amqp://adaptix:adaptix123@rabbitmq:5672/")
            connection = Connection(BROKER_URL)
            connection.connect()
            
            exchange = Exchange("events", type="topic", durable=True)
            producer = Producer(connection)
            
            event_payload = {
                "event": "production.materials_consumed",
                "order_id": str(order.id),
                "order_uuid": str(order.uuid),
                "company_uuid": str(order.company_uuid),
                "items": items
            }
            
            producer.publish(
                json.dumps(event_payload, cls=DjangoJSONEncoder),
                exchange=exchange,
                routing_key="production.materials_consumed",
                declare=[exchange],
                retry=True
            )
            connection.release()
            print(f"Published production.materials_consumed event for Order {order.id}")
            
        except Exception as e:
            print(f"Failed to publish Consumption event: {e}")

    @viewsets.decorators.action(detail=False, methods=['post'], url_path='check-availability')
    def check_availability(self, request):
        """
        Check if we have enough raw materials for an order (or simulated order).
        Payload: { "order_id": 1 } OR { "bom_id": 1, "quantity": 100 }
        """
        import requests
        from rest_framework.response import Response
        
        bom_id = request.data.get('bom_id')
        quantity = float(request.data.get('quantity', 0))
        order_id = request.data.get('order_id')
        
        bom = None
        
        if order_id:
            try:
                order = ProductionOrder.objects.get(pk=order_id)
                bom = order.bom
                quantity = float(order.quantity_planned)
            except ProductionOrder.DoesNotExist:
                 return Response({"error": "Order not found"}, status=404)
        elif bom_id:
            try:
                bom = BillOfMaterial.objects.get(pk=bom_id)
            except BillOfMaterial.DoesNotExist:
                 return Response({"error": "BOM not found"}, status=404)
        
        if not bom:
             return Response({"error": "BOM or Order required"}, status=400)
            
        # 1. Calculate Required Components
        required_items = {} # uuid -> qty needed
        for item in bom.items.all():
            total_needed = float(item.quantity) * quantity
            required_items[str(item.component_uuid)] = total_needed
            
        if not required_items:
             return Response({"status": "OK", "message": "No components required"})

        # 2. Call Inventory Service
        # We assume Inventory Service is reachable at adaptix-inventory:8000 internally
        # Authorization? We might need to forward the token or use a service token. 
        # For this MVP, we rely on internal network trust or mock headers.
        # Actually, standard adaptix auth requires a valid JWT.
        # We can forward the user's token from `request.headers`.
        
        inventory_url = "http://adaptix-inventory:8000/api/inventory/stocks/bulk_check/"
        token = request.headers.get("Authorization")
        
        try:
            resp = requests.post(
                inventory_url, 
                json={"product_uuids": list(required_items.keys())},
                headers={"Authorization": token, "Content-Type": "application/json"},
                timeout=5
            )
            
            if resp.status_code != 200:
                return Response({"error": "Failed to check inventory", "details": resp.text}, status=502)
                
            stock_data = resp.json() # { "uuid": qty }
            
            shortages = []
            has_shortage = False
            
            for uuid, needed in required_items.items():
                available = float(stock_data.get(uuid, 0))
                if available < needed:
                    has_shortage = True
                    shortages.append({
                        "component_uuid": uuid,
                        "needed": needed,
                        "available": available,
                        "shortage": needed - available
                    })
            
            if has_shortage:
                return Response({
                    "status": "SHORTAGE", 
                    "can_produce": False,
                    "shortages": shortages
                })
            else:
                return Response({
                    "status": "AVAILABLE",
                    "can_produce": True
                })

        except Exception as e:
             return Response({"error": f"Inventory check failed: {e}"}, status=500)
