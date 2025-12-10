from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import Coupon
from .serializers import CouponSerializer, ValidateCouponSerializer

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    lookup_field = 'code'

    @extend_schema(request=ValidateCouponSerializer, responses={200: {'valid': 'boolean', 'discount': 'decimal'}})
    @action(detail=False, methods=['post'])
    def validate(self, request):
        serializer = ValidateCouponSerializer(data=request.data)
        if serializer.is_valid():
            code = serializer.validated_data['code']
            amount = serializer.validated_data['amount']
            
            try:
                coupon = Coupon.objects.get(code=code)
                if coupon.is_valid() and amount >= coupon.min_purchase_amount:
                    discount = 0
                    if coupon.discount_type == 'percent':
                         discount = (amount * coupon.value) / 100
                    else:
                         discount = coupon.value
                    
                    return Response({
                        "valid": True,
                        "discount": discount,
                        "message": "Coupon applied successfully"
                    })
                else:
                    return Response({
                        "valid": False,
                        "discount": 0,
                        "message": "Coupon is invalid or minimum purchase not met"
                    }, status=status.HTTP_400_BAD_REQUEST)

            except Coupon.DoesNotExist:
                return Response({
                    "valid": False,
                    "discount": 0,
                    "message": "Coupon not found"
                }, status=status.HTTP_404_NOT_FOUND)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
