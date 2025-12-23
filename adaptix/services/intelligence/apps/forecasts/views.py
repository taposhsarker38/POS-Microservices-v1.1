from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Forecast, SalesHistory
from .serializers import ForecastSerializer, SalesHistorySerializer
from .tasks import run_forecasts

class ForecastViewSet(viewsets.ModelViewSet):
    serializer_class = ForecastSerializer
    
    def get_queryset(self):
        company_uuid = getattr(self.request, 'company_uuid', None)
        queryset = Forecast.objects.filter(company_uuid=company_uuid)
        if product_uuid := self.request.query_params.get('product_uuid'):
            queryset = queryset.filter(product_uuid=product_uuid)
        return queryset

    @action(detail=False, methods=['post'])
    def trigger(self, request):
        company_uuid = getattr(request, 'company_uuid', None)
        # Trigger async task
        run_forecasts.delay(company_uuid=company_uuid)
        return Response({"status": "Forecast job triggered"}, status=status.HTTP_202_ACCEPTED)

class SalesHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SalesHistorySerializer

    def get_queryset(self):
        company_uuid = getattr(self.request, 'company_uuid', None)
        return SalesHistory.objects.filter(company_uuid=company_uuid)
