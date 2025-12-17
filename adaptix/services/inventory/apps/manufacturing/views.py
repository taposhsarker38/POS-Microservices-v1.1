from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import WorkCenter, BillOfMaterial, BOMItem, ProductionOrder
from .serializers import (
    WorkCenterSerializer,
    BillOfMaterialSerializer,
    ProductionOrderSerializer,
    BOMItemSerializer
)

class WorkCenterViewSet(viewsets.ModelViewSet):
    queryset = WorkCenter.objects.all()
    serializer_class = WorkCenterSerializer
    permission_classes = [permissions.IsAuthenticated]

class BillOfMaterialViewSet(viewsets.ModelViewSet):
    queryset = BillOfMaterial.objects.all()
    serializer_class = BillOfMaterialSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product_uuid']

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        bom = self.get_object()
        serializer = BOMItemSerializer(data={**request.data, 'bom': bom.id})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProductionOrderViewSet(viewsets.ModelViewSet):
    queryset = ProductionOrder.objects.all()
    serializer_class = ProductionOrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'product_uuid', 'work_center']

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark production order as completed and update stock (logic to be implemented later)"""
        po = self.get_object()
        if po.status == 'COMPLETED':
            return Response({'error': 'Already completed'}, status=status.HTTP_400_BAD_REQUEST)
        
        po.status = 'COMPLETED'
        po.quantity_produced = po.quantity_planned # Simplified for now
        po.save()
        
        # TODO: Implement Stock Adjustment Logic Here (Deduct Ingredients, Add Finished Product)
        
        return Response({'status': 'Production Order Completed'})
