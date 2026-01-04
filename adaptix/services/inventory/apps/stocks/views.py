from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Warehouse, Stock, StockTransaction, UOMConversion, StockSerial, BillOfMaterial, StockTransfer, StockTransferItem
from .serializers import (
    WarehouseSerializer, StockSerializer, StockTransactionSerializer,
    UOMConversionSerializer, StockSerialSerializer, BillOfMaterialSerializer,
    StockAdjustmentSerializer, StockTransferSerializer, StockTransferItemSerializer
)
from adaptix_core.permissions import HasPermission
from rest_framework.decorators import action

class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    permission_classes = [HasPermission]
    required_permission = "inventory.warehouse"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()
    
    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=uuid)

class StockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [HasPermission]
    required_permission = "inventory.stock"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        qs = self.queryset
        if uuid:
            qs = qs.filter(company_uuid=uuid)
        
        # Filters
        # Filters
        warehouse = self.request.query_params.get('warehouse')
        product = self.request.query_params.get('product')
        if warehouse:
            qs = qs.filter(warehouse=warehouse)
        if product:
            qs = qs.filter(product_uuid=product)
        return qs

    @action(detail=False, methods=['post'])
    def adjust(self, request):
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        company_uuid = getattr(request, "company_uuid", None)
        
        if not company_uuid:
             return Response({"detail": "Company context missing"}, status=status.HTTP_400_BAD_REQUEST)

        # Get Warehouse
        try:
            warehouse = Warehouse.objects.get(id=data['warehouse_id'], company_uuid=company_uuid)
        except Warehouse.DoesNotExist:
             return Response({"detail": "Warehouse not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get or Create Stock
        stock, created = Stock.objects.get_or_create(
            company_uuid=company_uuid,
            warehouse=warehouse,
            product_uuid=data['product_uuid'],
            defaults={'quantity': 0}
        )
        
        qty = data['quantity']
        tx_type = 'adjustment_add' if data['type'] == 'add' else 'adjustment_sub'
        change = qty if data['type'] == 'add' else -qty
        
        # Update Quantity
        stock.quantity += change
        stock.save()
        
        # Create Transaction Log
        StockTransaction.objects.create(
            company_uuid=company_uuid,
            stock=stock,
            type=tx_type,
            quantity_change=change,
            balance_after=stock.quantity,
            notes=data.get('notes', ''),
            created_by=request.user_claims.get('user_id', 'api') if hasattr(request, 'user_claims') else 'api'
        )
        
        return Response(StockSerializer(stock).data)

    @action(detail=False, methods=['post'])
    def bulk_check(self, request):
        """
        Check stock for multiple products.
        Payload: { "product_uuids": ["uuid1", "uuid2"] }
        """
        uuids = request.data.get('product_uuids', [])
        company_uuid = getattr(request, "company_uuid", None)
        
        if not company_uuid:
             return Response({"detail": "Company context missing"}, status=status.HTTP_400_BAD_REQUEST)

        # Aggregate stock per product across all warehouses
        # Or just return list of stock records
        stocks = Stock.objects.filter(company_uuid=company_uuid, product_uuid__in=uuids)
        
        # Group by product
        results = {}
        for s in stocks:
            p_uuid = str(s.product_uuid)
            if p_uuid not in results:
                results[p_uuid] = 0
            results[p_uuid] += float(s.quantity)
            
        return Response(results)

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = StockTransaction.objects.all()
    serializer_class = StockTransactionSerializer
    permission_classes = [HasPermission]
    required_permission = "inventory.transaction"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(stock__company_uuid=uuid)
        return self.queryset.none()
    
    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(created_by="api")

class UOMConversionViewSet(viewsets.ModelViewSet):
    queryset = UOMConversion.objects.all()
    serializer_class = UOMConversionSerializer
    permission_classes = [HasPermission]
    required_permission = "inventory.uom"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
             return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=uuid)

class StockSerialViewSet(viewsets.ModelViewSet):
    queryset = StockSerial.objects.all()
    serializer_class = StockSerialSerializer
    permission_classes = [HasPermission]
    required_permission = "inventory.serial"

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
    required_permission = "inventory.bom"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
             return self.queryset.filter(company_uuid=uuid)
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=uuid)

from django.db import transaction

class StockTransferViewSet(viewsets.ModelViewSet):
    queryset = StockTransfer.objects.all()
    serializer_class = StockTransferSerializer
    permission_classes = [HasPermission]
    required_permission = "inventory.stock"

    def get_queryset(self):
        uuid = getattr(self.request, "company_uuid", None)
        if uuid:
            return self.queryset.filter(company_uuid=uuid).prefetch_related('items')
        return self.queryset.none()

    def perform_create(self, serializer):
        uuid = getattr(self.request, "company_uuid", None)
        claims = getattr(self.request, "user_claims", {})
        user_id = claims.get("sub")
        serializer.save(company_uuid=uuid, created_by=user_id)

    @action(detail=True, methods=['post'])
    def ship(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'DRAFT':
            return Response({"error": "Only draft transfers can be shipped"}, status=400)
        
        with transaction.atomic():
            for item in transfer.items.all():
                # Deduct from source
                stock, _ = Stock.objects.get_or_create(
                    company_uuid=transfer.company_uuid,
                    warehouse=transfer.source_warehouse,
                    product_uuid=item.product_uuid,
                    defaults={'quantity': 0}
                )
                
                if stock.quantity < item.quantity:
                    raise serializers.ValidationError(f"Insufficient stock for {item.product_uuid} in source warehouse")
                
                stock.quantity -= item.quantity
                stock.save()
                
                StockTransaction.objects.create(
                    company_uuid=transfer.company_uuid,
                    stock=stock,
                    type='transfer_out',
                    quantity_change=-item.quantity,
                    balance_after=stock.quantity,
                    reference_no=transfer.reference_no,
                    notes=f"Shipped via Transfer {transfer.reference_no}"
                )
            
            transfer.status = 'SHIPPED'
            transfer.save()
            
        return Response(StockTransferSerializer(transfer).data)

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status != 'SHIPPED':
            return Response({"error": "Only shipped transfers can be received"}, status=400)
        
        with transaction.atomic():
            for item in transfer.items.all():
                # Add to destination
                stock, _ = Stock.objects.get_or_create(
                    company_uuid=transfer.company_uuid,
                    warehouse=transfer.destination_warehouse,
                    product_uuid=item.product_uuid,
                    defaults={'quantity': 0}
                )
                
                stock.quantity += item.quantity
                stock.save()
                
                StockTransaction.objects.create(
                    company_uuid=transfer.company_uuid,
                    stock=stock,
                    type='transfer_in',
                    quantity_change=item.quantity,
                    balance_after=stock.quantity,
                    reference_no=transfer.reference_no,
                    notes=f"Received via Transfer {transfer.reference_no}"
                )
            
            transfer.status = 'RECEIVED'
            transfer.save()
            
        return Response(StockTransferSerializer(transfer).data)
