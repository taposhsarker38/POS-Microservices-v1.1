import requests
import logging
from django.utils import timezone
from datetime import datetime
from .models import AutomationRule, ActionLog, Workflow, WorkflowInstance

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
            'trigger_rfq': ActionRunner._trigger_rfq,
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

    @staticmethod
    def _trigger_rfq(rule, context):
        """
        Action that triggers an RFQ in the Purchase service.
        """
        from adaptix_core.service_registry import ServiceRegistry
        
        purchase_url = f"{ServiceRegistry.get_api_url('purchase')}/rfqs/"
        
        # Product info should be in context (from inventory stock event)
        product_uuid = context.get('product_uuid')
        quantity = rule.action_config.get('quantity', 100) # Default quantity to request
        
        if not product_uuid:
             logger.error("trigger_rfq action failed: No product_uuid in context")
             return "Failed: No product_uuid"

        payload = {
            "title": f"Auto RFQ for low stock item: {product_uuid}",
            "description": "Triggered by automated low stock alert.",
            "product_uuid": product_uuid,
            "quantity": quantity,
            "deadline": (timezone.now() + timezone.timedelta(days=7)).isoformat(), # 7 days deadline
        }
        
        # In a real microservice we'd use a service-to-service token
        # For now, we use a placeholder or system token if available
        headers = {
            "X-Company-Id": str(rule.company_uuid),
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(purchase_url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            logger.info(f"RFQ triggered successfully for product {product_uuid}")
            return "RFQ Triggered"
        except Exception as e:
            logger.error(f"Failed to trigger RFQ: {e}")
            raise

class WorkflowRunner:
    """
    Handles execution of multi-step workflows.
    """
    @staticmethod
    def start(workflow, company_uuid, context):
        instance = WorkflowInstance.objects.create(
            workflow=workflow,
            company_uuid=company_uuid,
            context_data=context,
            status='running'
        )
        WorkflowRunner.execute_next_step(instance)
        return instance

    @staticmethod
    def execute_next_step(instance):
        flow_data = instance.workflow.flow_data
        nodes = flow_data.get('nodes', [])
        edges = flow_data.get('edges', [])
        
        # Simple BFS/DFS progression based on current_node_id
        if not instance.current_node_id:
            # Find start node (e.g. type: 'trigger')
            start_node = next((n for n in nodes if n.get('type') == 'trigger'), None)
            if not start_node:
                instance.status = 'failed'
                instance.save()
                return
            instance.current_node_id = start_node['id']
            
        # Find current node
        current_node = next((n for n in nodes if n['id'] == instance.current_node_id), None)
        if not current_node:
            instance.status = 'failed'
            instance.save()
            return
            
        # Find next nodes
        next_edges = [e for e in edges if e['source'] == instance.current_node_id]
        if not next_edges:
            instance.set_completed()
            return
            
        # If multiple edges, logic usually depends on node type (like condition)
        # For simple linear, we take the first. For condition, we'll pick based on result.
        
        # We'll postpone finding next_node to _process_node or call it sequentially
        WorkflowRunner._process_node(instance, current_node, next_edges, nodes)

    @staticmethod
    def _process_node(instance, node, next_edges, all_nodes):
        node_type = node.get('type')
        data = node.get('data', {})
        
        if node_type == 'action':
            # ... existing action logic ...
            rule_stub = type('RuleStub', (), {
                'action_type': data.get('action_type'),
                'action_config': data.get('config', {}),
                'name': f"FlowStep: {node['id']}"
            })
            try:
                ActionRunner.run(rule_stub, instance.context_data)
                # Linear progression
                if next_edges:
                    instance.current_node_id = next_edges[0]['target']
                    instance.save()
                    WorkflowRunner.execute_next_step(instance)
                else:
                    instance.set_completed()
            except Exception as e:
                instance.status = 'failed'
                instance.save()
                logger.error(f"Workflow {instance.id} failed at node {node['id']}: {e}")

        elif node_type == 'condition':
            # Branching logic: condition based on data in context
            # We expect edges to have a 'label' or 'condition' like 'True'/'False'
            # Or data.condition to define what to check
            condition_met = RuleEngine._check_condition_logic(
                data.get('field'), 
                data.get('operator', '=='), 
                data.get('value'), 
                instance.context_data
            )
            
            target_label = 'True' if condition_met else 'False'
            edge = next((e for e in next_edges if e.get('label') == target_label), None)
            
            if not edge and next_edges:
                 # Fallback to first if no labels match
                 edge = next_edges[0]
            
            if edge:
                instance.current_node_id = edge['target']
                instance.save()
                WorkflowRunner.execute_next_step(instance)
            else:
                instance.set_completed()

        elif node_type == 'approval':
            instance.status = 'pending_approval'
            instance.save()
            logger.info(f"Workflow {instance.id} waiting for approval at node {node['id']}")

        elif node_type == 'trigger':
            # Trigger node itself just continues
            if next_edges:
                instance.current_node_id = next_edges[0]['target']
                instance.save()
                WorkflowRunner.execute_next_step(instance)
            else:
                instance.set_completed()

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
            
        # Also check Workflows
        workflows = Workflow.objects.filter(is_active=True)
        if company_uuid:
            workflows = workflows.filter(company_uuid=company_uuid)
            
        # For now, we only trigger workflows that have a trigger node matching trigger_type
        # In a real system, we'd have a trigger registry
            
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
        
        for wf in workflows:
            # Check if workflow starts with this trigger
            start_node = next((n for n in wf.flow_data.get('nodes', []) if n.get('type') == 'trigger'), None)
            if start_node and start_node.get('data', {}).get('event') == trigger_type:
                # Start workflow
                WorkflowRunner.start(wf, company_uuid, context)
                results.append({"workflow_id": str(wf.id), "status": "started"})
                
        return results

    @staticmethod
    def _check_condition(rule, context):
        return RuleEngine._check_condition_logic(
            rule.condition_field,
            rule.condition_operator,
            rule.condition_value,
            context
        )

    @staticmethod
    def _check_condition_logic(field, op, target_value, context):
        if not field:
            return True
            
        value_to_check = context.get(field)
        if value_to_check is None:
            return False
        
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

class SchedulerRunner:
    """
    Checks and runs scheduled automation rules and workflows.
    Called by a periodic heartbeat task.
    """
    @staticmethod
    def run_heartbeat():
        now = timezone.now()
        logger.info(f"Automation heartbeat at {now}")
        
        # Check Rules
        scheduled_rules = AutomationRule.objects.filter(is_active=True, is_scheduled=True)
        for rule in scheduled_rules:
            if SchedulerRunner._should_run(rule, now):
                # Using 'scheduled' as trigger type
                RuleEngine.evaluate(rule.trigger_type, {"scheduled_at": str(now)}, company_uuid=rule.company_uuid)

    @staticmethod
    def _should_run(rule, now):
        # Basic check: if never run or last run was more than the interval ago
        # trigger_config: {"interval_minutes": 60} or {"cron": "0 17 * * 5"}
        config = rule.trigger_config
        last_run = rule.last_triggered_at
        
        if not last_run:
            return True # Run first time
            
        interval = config.get('interval_minutes')
        if interval:
            delta = now - last_run
            return delta.total_seconds() >= (interval * 60)
            
        # Cron parsing using croniter
        cron_expr = config.get('cron')
        if cron_expr:
            try:
                from croniter import croniter
                # croniter expects the *previous* run time to calculate the next one
                # If never run, assume it should run if the current time matches the schedule window
                # But a safer approach for periodic checks:
                # Get the *previous* expected run time relative to NOW.
                # If that previous time is > last_run, then we missed a run (or it's due).
                
                # Check if we should have run since the last execution
                iter = croniter(cron_expr, now)
                prev_scheduled = iter.get_prev(datetime) # get the previous scheduled time
                
                if not last_run:
                    # If never run, and we are currently IN the minute of the schedule, run it?
                    # Or simpler: just run immediately if it's a new rule. 
                    # Let's say: run if create_at is older than prev_scheduled? 
                    # For safety, let's just return True to initialize the cycle.
                    return True
                
                # If the previous scheduled time is AFTER the last actual run, we are due.
                # Example: Now is 17:01. Prev sched was 17:00. Last run was 16:00.
                # 17:00 > 16:00 -> True.
                return prev_scheduled > last_run
            except Exception as e:
                logger.error(f"Invalid cron expression for rule {rule.id}: {e}")
                return False

        return False
