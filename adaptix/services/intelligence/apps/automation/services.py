import requests
import logging
from django.utils import timezone
from .models import AutomationRule, ActionLog

logger = logging.getLogger(__name__)

class ActionRunner:
    """
    Executes specific actions defined in automation rules.
    """
    @staticmethod
    def run(rule: AutomationRule, context: dict):
        handlers = {
            'email': ActionRunner._send_email,
            'webhook': ActionRunner._call_webhook,
            'log': ActionRunner._log_alert,
        }
        
        handler = handlers.get(rule.action_type)
        if not handler:
            raise ValueError(f"Unknown action type: {rule.action_type}")
            
        return handler(rule, context)

    @staticmethod
    def _send_email(rule, context):
        # Implementation for sending email (stub for now, but ready for SMTP)
        config = rule.action_config
        recipient = config.get('to')
        subject = config.get('subject', f"Adaptix Alert: {rule.name}")
        body = config.get('body', f"Automation triggered by {rule.trigger_type}")
        
        logger.info(f"Sending email to {recipient}: {subject}")
        return f"Email sent to {recipient}"

    @staticmethod
    def _call_webhook(rule, context):
        config = rule.action_config
        url = config.get('url')
        headers = config.get('headers', {})
        
        response = requests.post(url, json=context, headers=headers, timeout=10)
        response.raise_for_status()
        return f"Webhook called successfully. Status: {response.status_code}"

    @staticmethod
    def _log_alert(rule, context):
        message = rule.action_config.get('message', 'Automation triggered')
        logger.warning(f"ALERT LOG [{rule.name}]: {message} - Context: {context}")
        return "Logged locally"

class RuleEngine:
    """
    Evaluates automation rules based on triggers and executes actions.
    """
    
    @staticmethod
    def evaluate(trigger_type: str, context: dict, company_uuid=None):
        """
        Evaluate all active rules for a given trigger type and company.
        """
        rules = AutomationRule.objects.filter(trigger_type=trigger_type, is_active=True)
        if company_uuid:
            rules = rules.filter(company_uuid=company_uuid)
            
        results = []
        for rule in rules:
            if RuleEngine._check_condition(rule, context):
                # We trigger execution via a celery task
                from .tasks import execute_rule_action
                execute_rule_action.delay(str(rule.id), context)
                
                # Mark as triggered
                rule.last_triggered_at = timezone.now()
                rule.save(update_fields=['last_triggered_at'])
                
                results.append({"rule_id": str(rule.id), "status": "queued"})
                
        return results

    @staticmethod
    def _check_condition(rule, context):
        if not rule.condition_field:
            return True
            
        value_to_check = context.get(rule.condition_field)
        if value_to_check is None:
            return False
            
        target_value = rule.condition_value
        op = rule.condition_operator
        
        # Type conversion
        try:
            if isinstance(value_to_check, (int, float)):
                target_value = float(target_value)
            elif isinstance(value_to_check, bool):
                target_value = str(target_value).lower() == 'true'
        except:
            pass

        operators = {
            '==': lambda a, b: a == b,
            '!=': lambda a, b: a != b,
            '>': lambda a, b: a > b,
            '<': lambda a, b: a < b,
            '>=': lambda a, b: a >= b,
            '<=': lambda a, b: a <= b,
        }
        
        checker = operators.get(op)
        if checker:
            try:
                return checker(value_to_check, target_value)
            except:
                return False
                
        return False
