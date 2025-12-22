from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Warehouse, Stock, StockTransaction, UOMConversion, StockSerial, BillOfMaterial
from .serializers import (
    WarehouseSerializer, StockSerializer, StockTransactionSerializer,
    UOMConversionSerializer, StockSerialSerializer, BillOfMaterialSerializer,
    StockAdjustmentSerializer
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
