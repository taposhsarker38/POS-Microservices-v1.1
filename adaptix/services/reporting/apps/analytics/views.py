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
        company_uuid = getattr(request, 'company_uuid', None) or request.headers.get("X-Company-UUID")
        # Fallback to query param
        if not company_uuid:
             company_uuid = request.query_params.get("company_uuid")
        
        filter_kwargs = {}
        if company_uuid:
            filter_kwargs['company_uuid'] = company_uuid
            
        wing = request.query_params.get("wing_uuid")
        if wing:
            filter_kwargs['wing_uuid'] = wing

        total_revenue = DailySales.objects.filter(**filter_kwargs).aggregate(Sum('total_revenue'))['total_revenue__sum'] or 0
        total_transactions = DailySales.objects.filter(**filter_kwargs).aggregate(Sum('total_transactions'))['total_transactions__sum'] or 0
        
        top_products = TopProduct.objects.filter(**filter_kwargs).order_by('-total_sold')[:5]

        return Response({
            "total_revenue": total_revenue,
            "total_transactions": total_transactions,
            "top_products": TopProductSerializer(top_products, many=True).data
        })

class DailySalesViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DailySales.objects.all().order_by('-date')
    serializer_class = DailySalesSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        company_uuid = self.request.query_params.get("company_uuid")
        if company_uuid:
            qs = qs.filter(company_uuid=company_uuid)
        return qs

class TopProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TopProduct.objects.all()
    serializer_class = TopProductSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()
        company_uuid = self.request.query_params.get("company_uuid")
        if company_uuid:
            qs = qs.filter(company_uuid=company_uuid)
        return qs

class ManufacturingAnalyticsViewSet(viewsets.ViewSet):
    """
    aggregated manufacturing data
    """
    @extend_schema(responses={200: {'total_produced': 'int', 'total_defects': 'int'}})
    @action(detail=False, methods=['get'])
    def machine_stats(self, request):
        from .models import DailyProduction
        
        company_uuid = request.query_params.get("company_uuid")
        filter_kwargs = {}
        if company_uuid:
            filter_kwargs['company_uuid'] = company_uuid
        
        total_produced = DailyProduction.objects.filter(**filter_kwargs).aggregate(Sum('total_produced'))['total_produced__sum'] or 0
        total_defects = DailyProduction.objects.filter(**filter_kwargs).aggregate(Sum('total_defects'))['total_defects__sum'] or 0
        
        return Response({
            "total_produced": total_produced,
            "total_defects": total_defects,
            "efficiency_rate": round((total_produced / (total_produced + total_defects)) * 100, 1) if (total_produced + total_defects) > 0 else 100
        })
