from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema
from django.db.models import Sum
from .models import DailySales, TopProduct
from .serializers import DailySalesSerializer, TopProductSerializer

class AnalyticsViewSet(viewsets.ViewSet):
    """
    Viewset for aggregated analytics data.
    """
    @extend_schema(responses={200: {'total_revenue': 'decimal', 'total_transactions': 'int'}})
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        total_revenue = DailySales.objects.aggregate(Sum('total_revenue'))['total_revenue__sum'] or 0
        total_transactions = DailySales.objects.aggregate(Sum('total_transactions'))['total_transactions__sum'] or 0
        
        return Response({
            "total_revenue": total_revenue,
            "total_transactions": total_transactions,
            "top_products": TopProductSerializer(TopProduct.objects.all()[:5], many=True).data
        })

class DailySalesViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DailySales.objects.all().order_by('-date')
    serializer_class = DailySalesSerializer

class TopProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TopProduct.objects.all()
    serializer_class = TopProductSerializer
