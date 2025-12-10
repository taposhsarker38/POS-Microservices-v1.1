import uuid
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import Payment, Transaction
from .serializers import PaymentSerializer, ProcessPaymentSerializer

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    @extend_schema(request=ProcessPaymentSerializer, responses=PaymentSerializer)
    @action(detail=False, methods=['post'])
    def process(self, request):
        serializer = ProcessPaymentSerializer(data=request.data)
        if serializer.is_valid():
            # Create Pending Payment
            payment = Payment.objects.create(
                order_id=serializer.validated_data['order_id'],
                amount=serializer.validated_data['amount'],
                currency=serializer.validated_data['currency'],
                method=serializer.validated_data['method'],
                status='pending'
            )

            # Mock Gateway Logic
            method = serializer.validated_data['method']
            success = True
            gateway_response = {"id": f"ch_{uuid.uuid4()}", "status": "succeeded"}
            
            if method == 'card':
                # Simulate Mock Gateway Call
                if serializer.validated_data.get('card_number') == '0000':
                    success = False
                    gateway_response = {"error": "Card Declined"}
            
            # Update Status
            if success:
                payment.status = 'completed'
                payment.stripe_charge_id = gateway_response.get('id')
            else:
                payment.status = 'failed'
            
            payment.save()

            # Log Transaction
            Transaction.objects.create(
                payment=payment,
                status=gateway_response.get('status', 'failed') if success else 'failed',
                gateway_response=gateway_response
            )

            return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
