from .models import AutomationRule, ActionLog
from datetime import datetime

class RuleEngine:
    """
    Evaluates automation rules based on triggers and executes actions.
    """
    
    @staticmethod
    def evaluate(trigger_type: str, context: dict):
        """
        Evaluate all active rules for a given trigger type.
        
        Args:
            trigger_type (str): The type of event triggering the evaluation (e.g. 'stock_level')
            context (dict): Data associated with the event (e.g. {'quantity': 5, 'product_id': '...'})
        """
        rules = AutomationRule.objects.filter(trigger_type=trigger_type, is_active=True)
        results = []
        
        for rule in rules:
            if RuleEngine._check_condition(rule, context):
                result = RuleEngine._execute_action(rule, context)
                results.append(result)
                
        return results

    @staticmethod
    def _check_condition(rule, context):
        """
        Simple condition checker.
        Supports: ==, !=, >, <, >=, <=
        Expects rule.condition_field to be present in context.
        """
        if not rule.condition_field:
            return True # No condition implies always run on trigger
            
        value_to_check = context.get(rule.condition_field)
        if value_to_check is None:
            return False # Context missing required data
            
        target_value = rule.condition_value
        op = rule.condition_operator
        
        # Type conversion (naive)
        # Try to convert target_value to match type of value_to_check
        try:
            if isinstance(value_to_check, (int, float)):
                target_value = float(target_value)
            elif isinstance(value_to_check, bool):
                target_value = target_value.lower() == 'true'
        except:
            pass # Keep as string comparison if conversion fails

        if op == '==':
            return value_to_check == target_value
        elif op == '!=':
            return value_to_check != target_value
        elif op == '>':
            return value_to_check > target_value
        elif op == '<':
            return value_to_check < target_value
        elif op == '>=':
            return value_to_check >= target_value
        elif op == '<=':
            return value_to_check <= target_value
            
        return False

    @staticmethod
    def _execute_action(rule, context):
        """
        Execute the defined action. For now, we mainly log it.
        """
        try:
            # Placeholder for real action logic (e.g. send email via celery, call webhook)
            details = f"Action {rule.action_type} executed. Config: {rule.action_config}. Context: {context}"
            
            log = ActionLog.objects.create(
                rule=rule,
                status='success',
                details=details
            )
            return {"rule": rule.name, "status": "success", "log_id": log.id}
            
        except Exception as e:
            ActionLog.objects.create(
                rule=rule,
                status='failed',
                details=str(e)
            )
            return {"rule": rule.name, "status": "failed", "error": str(e)}
