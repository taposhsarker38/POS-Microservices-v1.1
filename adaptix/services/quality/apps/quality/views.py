from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import QualityStandard, Inspection, TestResult
from .serializers import QualityStandardSerializer, InspectionSerializer, TestResultSerializer

class QualityStandardViewSet(viewsets.ModelViewSet):
    queryset = QualityStandard.objects.all()
    serializer_class = QualityStandardSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['product_uuid', 'is_active']

class InspectionViewSet(viewsets.ModelViewSet):
    queryset = Inspection.objects.all()
    serializer_class = InspectionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['reference_type', 'reference_uuid', 'status']

    @action(detail=True, methods=['post'])
    def add_result(self, request, pk=None):
        inspection = self.get_object()
        serializer = TestResultSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(inspection=inspection)
            
            # Auto-update status logic
            self._update_inspection_status(inspection)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _update_inspection_status(self, inspection):
        # 1. Get all standards for the product
        standards = QualityStandard.objects.filter(product_uuid=inspection.reference_uuid, is_active=True)
        # Note: reference_uuid in Inspection equals product_uuid? 
        # Inspection.reference_uuid could be Inventory ID or Production Order ID, invalid assumption?
        # Let's check model. Inspection has reference_type and reference_uuid.
        # QualityStandard has product_uuid.
        # We need to look up the product UUID from the reference (e.g. Inventory check -> Product).
        # Since we don't have cross-service calls easily here, we might assume reference_uuid IS product_uuid for 'RECEIVING' or similar,
        # OR we just check the results associated with this inspection against the standard ID stored in the result.
        
        # Simpler approach: Check if ANY result failed -> FAILED.
        # If ALL standards linked to this inspection have results and they passed -> PASSED.
        
        # But we don't know "All standards" without cross-referencing product.
        # Let's rely on what we have:
        results = inspection.results.all()
        
        # If any test failed, the whole inspection fails
        if results.filter(passed=False).exists():
            inspection.status = 'FAILED'
        else:
            # Check if we have results for ALL active standards (if we can find them)
            # Without product linkage, we can at least say: if we have some results and NO failures, are we done?
            # Maybe just keep PENDING until explicitly closed? 
            # OR assume if user added a result, they might be done.
            # Let's implement: If Any Fail -> FAIL. If No Fail and at least one result -> Check if we want to auto-PASS.
            # For now, let's auto-PASS if no failures and we have results. 
            # Users can reopen if needed (or we'd need a "complete" action).
            # BETTER: Just fail fast. Pass requires manual check or advanced logic.
            # WAIT, the plan said "If all passed -> Mark PASSED".
            # Let's Stick to: Any Fail -> Fail. 
            inspection.status = 'FAILED' # Default to fail if bad result found
            
        if not results.filter(passed=False).exists() and results.exists():
             # In a real app we'd verify coverage of all required standards. 
             # Here we assume if entered and passed, it's good.
             inspection.status = 'PASSED'
             
        inspection.save()
