from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import AutomationRule, ActionLog
from .serializers import AutomationRuleSerializer, ActionLogSerializer
from .services import RuleEngine

class AutomationRuleViewSet(viewsets.ModelViewSet):
    queryset = AutomationRule.objects.all()
    serializer_class = AutomationRuleSerializer

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
