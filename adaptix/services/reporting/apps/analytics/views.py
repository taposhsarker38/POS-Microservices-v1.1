from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.http import HttpResponse
from datetime import datetime
from .pdf_service import PDFService
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

    @action(detail=False, methods=['get'], url_path='export-daily-production')
    def export_daily_production(self, request):
        company_uuid = request.query_params.get("company_uuid")
        # In a real scenario, we'd aggregate data from Manufacturing service or our local DailyProduction model
        from .models import DailyProduction
        
        # Simulating aggregation for the PDF
        data = {
             "date": datetime.now().strftime("%Y-%m-%d"),
             "total_produced": 120,
             "total_passed": 115,
             "total_failed": 5,
             "defects": [
                 {"category": "Cooling", "count": 3},
                 {"category": "Body", "count": 2}
             ]
        }
        
        pdf_buffer = PDFService.generate_daily_production_report(data)
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="daily_production_{data["date"]}.pdf"'
        return response

    @action(detail=False, methods=['get'], url_path='export-client-progress')
    def export_client_progress(self, request):
        customer_name = request.query_params.get("customer_name", "SSL Enterprise")
        # Specific data for the requested customer
        data = {
            "customer": customer_name,
            "target": 500,
            "ready": 320,
            "in_production": 180,
            "shipped": 85,
            "due_amount": 12500.50
        }
        
        pdf_buffer = PDFService.generate_customer_order_report(data)
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="client_progress_{data["customer"]}.pdf"'
        return response
    @action(detail=False, methods=['get'], url_path='export-qr-labels')
    def export_qr_labels(self, request):
        order_id = request.query_params.get("order_id")
        
        # In a real scenario, we'd fetch units for this order from Manufacturing
        # For now, let's mock the unit list
        units = [
            {"serial_number": f"FRZ-202601-A{i}", "model_name": "Deep Freeze 200L"}
            for i in range(1, 13)
        ]
        
        pdf_buffer = PDFService.generate_qr_labels(units)
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="qr_labels.pdf"'
        return response

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
