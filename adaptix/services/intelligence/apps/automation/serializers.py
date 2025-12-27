from rest_framework import serializers
from . import models

class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AutomationRule
        fields = '__all__'
        read_only_fields = ('company_uuid',)

class ActionLogSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    class Meta:
        model = models.ActionLog
        fields = '__all__'

class WorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Workflow
        fields = '__all__'
        read_only_fields = ('company_uuid',)

class WorkflowInstanceSerializer(serializers.ModelSerializer):
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    class Meta:
        model = models.WorkflowInstance
        fields = '__all__'
