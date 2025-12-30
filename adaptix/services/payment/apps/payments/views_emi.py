from decimal import Decimal
from rest_framework import viewsets, status, decorators
from rest_framework.response import Response
from .models import EMIPlan, EMISchedule, EMIInstallment
from .serializers_emi import (
    EMIPlanSerializer, EMIScheduleSerializer, 
    CreateEMIScheduleSerializer, EMIInstallmentSerializer
)

class EMIPlanViewSet(viewsets.ModelViewSet):
    queryset = EMIPlan.objects.all()
    serializer_class = EMIPlanSerializer

    def get_queryset(self):
        company_uuid = getattr(self.request, 'company_uuid', None)
        qs = self.queryset.filter(is_active=True)
        if company_uuid:
            return qs.filter(company_uuid=company_uuid)
        return qs

    def perform_create(self, serializer):
        company_uuid = getattr(self.request, 'company_uuid', None)
        serializer.save(company_uuid=company_uuid)

class EMIScheduleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EMISchedule.objects.all()
    serializer_class = EMIScheduleSerializer

    @decorators.action(detail=False, methods=['post'], url_path='create-schedule')
    def create_schedule(self, request):
        serializer = CreateEMIScheduleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        try:
            plan = EMIPlan.objects.get(id=data['plan_id'], is_active=True)
        except EMIPlan.DoesNotExist:
            return Response({"error": "Plan not found or inactive"}, status=status.HTTP_404_NOT_FOUND)

        # Calculate EMI (Flat Interest)
        # Total Interest = P * (R/100) * (T/12)
        p = data['amount']
        r = plan.interest_rate
        t = plan.tenure_months
        
        interest = p * (r / Decimal('100')) * (Decimal(t) / Decimal('12'))
        total_payable = p + interest
        monthly = total_payable / Decimal(t)

        schedule = EMISchedule.objects.create(
            order_id=data['order_id'],
            plan=plan,
            customer_uuid=data.get('customer_uuid'),
            principal_amount=p,
            interest_amount=interest,
            total_payable=total_payable,
            monthly_installment=monthly,
            company_uuid=getattr(request, 'company_uuid', None)
        )
        
        schedule.generate_installments()
        
        return Response(EMIScheduleSerializer(schedule).data, status=status.HTTP_201_CREATED)

class EMIInstallmentViewSet(viewsets.ModelViewSet):
    queryset = EMIInstallment.objects.all()
    serializer_class = EMIInstallmentSerializer

    @decorators.action(detail=True, methods=['post'], url_path='pay')
    def pay_installment(self, request, pk=None):
        installment = self.get_object()
        if installment.status == 'paid':
            return Response({"error": "Already paid"}, status=status.HTTP_400_BAD_REQUEST)
        
        installment.status = 'paid'
        installment.paid_date = timezone.now().date()
        installment.save()
        
        return Response(EMIInstallmentSerializer(installment).data)
