import pandas as pd
from celery import shared_task
from django.db import connection
from apps.inventory_opt.models import InventoryOptimization
from apps.forecasts.models import Forecast
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)

@shared_task(name="inventory_opt.analyze_stockout_risk")
def analyze_stockout_risk(company_uuid=None):
    """
    Combines SalesForecast with current Stock levels to detect risks.
    """
    logger.info(f"Starting stockout risk analysis. Company: {company_uuid}")
    
    # 1. Fetch current stock from inventory schema
    query = """
        SELECT company_uuid, product_uuid, SUM(quantity) as current_stock
        FROM inventory.stocks_stock
    """
    if company_uuid:
        query += " WHERE company_uuid = %s"
        query += " GROUP BY company_uuid, product_uuid"
        stock_df = pd.read_sql(query, connection, params=[str(company_uuid)])
    else:
        query += " GROUP BY company_uuid, product_uuid"
        stock_df = pd.read_sql(query, connection)

    if stock_df.empty:
        logger.warning("No stock data found for risk analysis.")
        return "No stock data"

    # 2. Iterate through each company/product to calculate risk
    processed_count = 0
    today = date.today()
    
    for _, row in stock_df.iterrows():
        comp_id = row['company_uuid']
        prod_id = row['product_uuid']
        qty = float(row['current_stock'])
        
        # Get future forecasts for this product
        forecasts = Forecast.objects.filter(
            company_uuid=comp_id,
            product_uuid=prod_id,
            forecast_date__gte=today
        ).order_by('forecast_date')
        
        if not forecasts.exists():
            continue
            
        # Cumulative demand vs current stock
        cumulative_demand = 0
        stockout_date = None
        risk_score = 0
        
        # Simple projection: when does qty - cumulative_demand < 0?
        for f in forecasts:
            cumulative_demand += float(f.predicted_quantity)
            if qty - cumulative_demand <= 0:
                stockout_date = f.forecast_date
                break
        
        # Calculate risk score (0-100)
        # High risk if stockout in < 7 days
        days_until_stockout = (stockout_date - today).days if stockout_date else 999
        
        if days_until_stockout <= 3:
            risk_score = 100
        elif days_until_stockout <= 7:
            risk_score = 75
        elif days_until_stockout <= 14:
            risk_score = 40
        else:
            risk_score = 10
            
        # Update/Create InventoryOptimization record
        InventoryOptimization.objects.update_or_create(
            company_uuid=comp_id,
            product_uuid=prod_id,
            defaults={
                'current_stock': int(qty),
                'avg_daily_consumption': cumulative_demand / 30, # Approx
                'suggested_reorder_point': int(cumulative_demand / 30 * 10), # 10 days safety
                'suggested_reorder_qty': int(cumulative_demand / 30 * 30), # 30 days stock
                'stockout_risk_score': risk_score,
                'estimated_stockout_date': stockout_date
            }
        )
        processed_count += 1
        
    logger.info(f"Finished risk analysis. Processed {processed_count} products.")
    return f"Processed {processed_count} items"
