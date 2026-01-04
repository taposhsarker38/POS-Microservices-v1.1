import pandas as pd
import numpy as np
from celery import shared_task
from django.db import connection
from apps.maintenance_opt.models import MaintenanceAnomaly
from datetime import datetime, timedelta
import logging
from adaptix_core.messaging import publish_event

logger = logging.getLogger(__name__)

@shared_task(name="maintenance_opt.analyze_asset_health")
def analyze_asset_health(company_uuid=None):
    """
    Analyzes Asset Telemetry to detect anomalies and predict maintenance needs.
    """
    logger.info(f"Starting asset health analysis. Company: {company_uuid}")
    
    # 1. Fetch recent telemetry from asset schema
    # Joining with assets to get metadata
    query = """
        SELECT t.asset_id, t.temperature, t.vibration, t.power_usage, t.usage_hours, t.timestamp,
               a.company_uuid, a.name as asset_name
        FROM asset.assets_assettelemetry t
        JOIN asset.assets_asset a ON t.asset_id = a.id
        WHERE t.timestamp > NOW() - INTERVAL '24 hours'
    """
    
    if company_uuid:
        query += " AND a.company_uuid = %s"
        df = pd.read_sql(query, connection, params=[str(company_uuid)])
    else:
        df = pd.read_sql(query, connection)

    if df.empty:
        logger.warning("No telemetry data found for analysis.")
        return "No telemetry data"

    # 2. Group by asset for analysis
    results = []
    for asset_id, group in df.groupby('asset_id'):
        comp_id = group['company_uuid'].iloc[0]
        asset_name = group['asset_name'].iloc[0]
        
        # Simple AI/Heuristic Logic:
        # A) Temperature Anomaly: Temp > 80C
        # B) Vibration Anomaly: Std Dev of vibration > 0.5 (indicates instability)
        # C) Usage Pattern: RUL prediction based on trend
        
        max_temp = group['temperature'].max()
        avg_vib = group['vibration'].mean()
        std_vib = group['vibration'].std()
        
        risk_score = 0
        reasons = []
        anomaly_type = ""

        if max_temp > 80:
            risk_score += 40
            reasons.append(f"Critical temperature spike detected: {max_temp:.1f}C")
            anomaly_type = "Overheating"
            
        if std_vib > 0.5:
            risk_score += 50
            reasons.append(f"Abnormal vibration pattern (StdDev: {std_vib:.2f})")
            anomaly_type = "Mechanical Instability" if not anomaly_type else "Multiple Anomalies"

        if risk_score > 0:
            # Save anomaly findings
            reason_text = " | ".join(reasons)
            anomaly, created = MaintenanceAnomaly.objects.update_or_create(
                company_uuid=comp_id,
                asset_id=asset_id,
                is_resolved=False,
                defaults={
                    'risk_score': min(risk_score, 100),
                    'failure_probability': float(risk_score / 100.0),
                    'anomaly_type': anomaly_type,
                    'reasoning': reason_text
                }
            )
            
            # 3. Publish Maintenance Requested event if risk is high
            if risk_score >= 40:
                event_payload = {
                    "event": "intelligence.maintenance.requested",
                    "asset_id": str(asset_id),
                    "asset_name": asset_name,
                    "company_uuid": str(comp_id),
                    "risk_score": risk_score,
                    "anomaly_type": anomaly_type,
                    "reasoning": reason_text,
                    "suggested_priority": "high" if risk_score >= 80 else "medium",
                    "suggestion_id": str(anomaly.id)
                }
                try:
                    publish_event("events", "intelligence.maintenance.requested", event_payload)
                    logger.info(f"Published maintenance request for {asset_name}")
                except Exception as e:
                    logger.error(f"Failed to publish event: {e}")

        results.append({"asset": asset_name, "risk": risk_score})

    return f"Analyzed {len(results)} assets. Found {len([r for r in results if r['risk'] > 0])} anomalies."
