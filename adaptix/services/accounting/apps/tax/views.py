from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Tax, TaxZone, TaxRule
from .serializers import (
    TaxSerializer, 
    TaxZoneSerializer, 
    TaxRuleSerializer,
    TaxCalculationRequestSerializer
)
from .services import TaxEngine

class TaxViewSet(viewsets.ModelViewSet):
    queryset = Tax.objects.all()
    serializer_class = TaxSerializer

    def get_queryset(self):
        company_uuid = self.request.headers.get('X-Company-Id')
        if company_uuid:
            return self.queryset.filter(company_uuid=company_uuid)
        return self.queryset

    def perform_create(self, serializer):
        company_uuid = self.request.headers.get('X-Company-Id')
        serializer.save(company_uuid=company_uuid)

class TaxZoneViewSet(viewsets.ModelViewSet):
    queryset = TaxZone.objects.all()
    serializer_class = TaxZoneSerializer

    def get_queryset(self):
        company_uuid = self.request.headers.get('X-Company-Id')
        if company_uuid:
            return self.queryset.filter(company_uuid=company_uuid)
        return self.queryset

    def perform_create(self, serializer):
        company_uuid = self.request.headers.get('X-Company-Id')
        serializer.save(company_uuid=company_uuid)

class TaxRuleViewSet(viewsets.ModelViewSet):
    queryset = TaxRule.objects.all()
    serializer_class = TaxRuleSerializer

    def get_queryset(self):
        company_uuid = self.request.headers.get('X-Company-Id')
        if company_uuid:
            return self.queryset.filter(company_uuid=company_uuid)
        return self.queryset

    def perform_create(self, serializer):
        company_uuid = self.request.headers.get('X-Company-Id')
        serializer.save(company_uuid=company_uuid)

class TaxEngineViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def calculate(self, request):
        serializer = TaxCalculationRequestSerializer(data=request.data)
        if serializer.is_valid():
            company_uuid = request.headers.get('X-Company-Id')
            if not company_uuid:
                return Response({"error": "Missing X-Company-Id header"}, status=status.HTTP_400_BAD_REQUEST)
            
            result = TaxEngine.calculate_tax(
                company_uuid=company_uuid,
                zone_code=serializer.validated_data['zone_code'],
                amount=serializer.validated_data['amount'],
                category_uuid=serializer.validated_data.get('product_category_uuid')
            )
            return Response(result)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
