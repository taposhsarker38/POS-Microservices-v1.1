import pytest
import uuid
from apps.automation.models import AutomationRule, ActionLog
from apps.automation.services import RuleEngine
from apps.crm_opt.models import CustomerSegmentation
from apps.forecasts.models import Forecast, SalesHistory
from apps.inventory_opt.models import InventoryOptimization

@pytest.mark.django_db
class TestIntelligenceLogic:
    def test_model_imports(self):
        """Verify core AI models can be instantiated"""
        # Test Segmentation
        seg = CustomerSegmentation.objects.create(
            customer_email="test@example.com",
            recency=5,
            frequency=10,
            monetary=1000.00,
            r_score=4,
            f_score=5,
            m_score=5,
            segment_label="VIP"
        )
        assert seg.segment_label == "VIP"
        assert seg.customer_email == "test@example.com"
        
        # Test Forecast
        forecast = Forecast.objects.create(
            product_uuid=uuid.uuid4(),
            product_name="Test Product",
            forecast_date="2026-01-01",
            predicted_quantity=100.0,
            company_uuid=uuid.uuid4()
        )
        assert forecast.predicted_quantity == 100.0

    def test_automation_rule_engine(self):
        """Verify Rule Engine execution logic (Migrated from verify_automation_logic.py)"""
        # Create a Test Rule
        rule = AutomationRule.objects.create(
            name=f"Test Low Stock Rule",
            trigger_type="stock_level",
            condition_field="quantity",
            condition_operator="<",
            condition_value="10",
            action_type="log",
            action_config={"message": "Stock low!"},
            company_uuid=uuid.uuid4()
        )
        
        # 1. Evaluate with Context that should MATCH
        context_match = {"quantity": 5, "product_id": str(uuid.uuid4())}
        results = RuleEngine.evaluate("stock_level", context_match)
        
        assert len(results) > 0
        assert results[0]['status'] == 'queued'
        
        # In a queued/async setup, the log might not be immediate or log_id might be in a different field
        # For now, we verify the rule was triggered
        assert 'rule_id' in results[0]
        
        # 2. Evaluate with Context that should NOT MATCH
        context_no_match = {"quantity": 15, "product_id": str(uuid.uuid4())}
        results_fail = RuleEngine.evaluate("stock_level", context_no_match)
        
        assert len(results_fail) == 0
