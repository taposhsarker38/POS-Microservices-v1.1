from celery import shared_task
import logging
from .models import AutomationRule, ActionLog
from .services import ActionRunner

logger = logging.getLogger(__name__)

@shared_task(name="automation.execute_rule_action", bind=True, max_retries=3)
def execute_rule_action(self, rule_id, context):
    """
    Asynchronously executes an automation rule's action.
    """
    try:
        rule = AutomationRule.objects.get(id=rule_id, is_active=True)
        
        logger.info(f"Executing automation rule: {rule.name} ({rule_id})")
        
        # Execute the action via ActionRunner
        result_details = ActionRunner.run(rule, context)
        
        # Log success
        ActionLog.objects.create(
            rule=rule,
            status='success',
            details=result_details
        )
        
        return f"Rule {rule.name} executed successfully"
        
    except AutomationRule.DoesNotExist:
        logger.error(f"Rule {rule_id} not found or inactive")
        return "Rule not found"
        
    except Exception as exc:
        logger.error(f"Error executing rule {rule_id}: {str(exc)}")
        
        # Log failure
        try:
            rule = AutomationRule.objects.get(id=rule_id)
            ActionLog.objects.create(
                rule=rule,
                status='failed',
                details=str(exc)
            )
        except:
            pass
            
        # Retry for transient errors (e.g. network issues with webhooks)
        raise self.retry(exc=exc, countdown=60)
