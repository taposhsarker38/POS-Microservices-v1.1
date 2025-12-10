from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Warehouse, Stock, StockTransaction, UOMConversion, StockSerial, BillOfMaterial
from .serializers import (
    WarehouseSerializer, StockSerializer, StockTransactionSerializer,
    UOMConversionSerializer, StockSerialSerializer, BillOfMaterialSerializer
)
from apps.utils.permissions import HasPermission

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
        warehouse = self.request.query_params.get('warehouse')
        product = self.request.query_params.get('product_uuid')
        if warehouse:
            qs = qs.filter(warehouse__id=warehouse)
        if product:
            qs = qs.filter(product_uuid=product)
        return qs

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
