from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import AutomationRule, ActionLog
from .serializers import AutomationRuleSerializer, ActionLogSerializer
from .services import RuleEngine

class AutomationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AutomationRuleSerializer

    def get_queryset(self):
        company_uuid = getattr(self.request, 'company_uuid', None)
        return AutomationRule.objects.filter(company_uuid=company_uuid, is_deleted=False)

    def perform_create(self, serializer):
        company_uuid = getattr(self.request, 'company_uuid', None)
        serializer.save(company_uuid=company_uuid)

class ActionLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActionLog.objects.all()
    serializer_class = ActionLogSerializer

class TriggerAutomationView(APIView):
    def post(self, request):
        trigger_type = request.data.get('trigger_type')
        context = request.data.get('context', {})
        
        if not trigger_type:
            return Response({"error": "trigger_type is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        results = RuleEngine.evaluate(trigger_type, context)
        
        return Response({
            "message": "Automation rules evaluated",
            "results": results
        })
