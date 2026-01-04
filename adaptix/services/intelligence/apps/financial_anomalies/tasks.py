import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from celery import shared_task
from django.db import connection
from django.utils import timezone
from .models import FinancialAnomaly
import logging

logger = logging.getLogger(__name__)

@shared_task
def analyze_financial_anomalies():
    """
    Scans accounting journals for statistical outliers and suspicious patterns.
    """
    # 1. Fetch recent journal items from accounting service via Direct DB Access (Schema sharing)
    # Join with ChartOfAccount to get group types
    query = """
        SELECT e.id as entry_id, e.date, e.reference, e.total_debit as amount, e.company_uuid,
               i.description, a.name as account_name, g.group_type
        FROM accounting.ledger_journalentry e
        JOIN accounting.ledger_journalitem i ON e.id = i.entry_id
        JOIN accounting.ledger_chartofaccount a ON i.account_id = a.id
        JOIN accounting.ledger_accountgroup g ON a.group_id = g.id
        WHERE e.date > NOW() - INTERVAL '30 days'
        AND i.debit > 0
    """
    
    try:
        df = pd.read_sql(query, connection)
    except Exception as e:
        logger.error(f"Failed to fetch finance data: {e}")
        return f"Error: {e}"

    if df.empty:
        return "No data to analyze."

    anomalies_count = 0
    df['amount'] = df['amount'].astype(float)

    # --- DETECTION 1: Statistical Outliers (Isolation Forest) ---
    # We group by company to detect relative outliers
    for company_uuid, company_df in df.groupby('company_uuid'):
        if len(company_df) < 5: continue # Need minimum data for IF
        
        X = company_df[['amount']].values
        clf = IsolationForest(contamination=0.03, random_state=42) # Expect ~3% outliers
        company_df['is_outlier'] = clf.fit_predict(X)
        company_df['anomaly_score'] = -clf.decision_function(X) # Higher score = more anomalous

        outliers = company_df[company_df['is_outlier'] == -1]
        
        for _, row in outliers.iterrows():
            FinancialAnomaly.objects.get_or_create(
                journal_entry_id=row['entry_id'],
                anomaly_type='statistical_outlier',
                defaults={
                    'company_uuid': company_uuid,
                    'journal_date': row['date'],
                    'journal_reference': row['reference'] or '',
                    'amount': row['amount'],
                    'category': row['account_name'],
                    'severity': 'high' if row['amount'] > company_df['amount'].mean() * 5 else 'medium',
                    'risk_score': min(1.0, row['anomaly_score'] + 0.5),
                    'reasoning': f"Transaction amount {row['amount']} is statistically significant compared to other {row['account_name']} entries."
                }
            )
            anomalies_count += 1

    # --- DETECTION 2: Round Number Flag (Suspicious High Value) ---
    # Many fraudulent entries use "clean" round numbers like 5000, 10000, etc.
    round_numbers = df[
        (df['amount'] >= 1000) & 
        (df['amount'] % 100 == 0) & 
        (df['description'].str.len() < 10) # Short descriptions + round numbers are suspicious
    ]
    
    for _, row in round_numbers.iterrows():
        FinancialAnomaly.objects.get_or_create(
            journal_entry_id=row['entry_id'],
            anomaly_type='round_number',
            defaults={
                'company_uuid': row['company_uuid'],
                'journal_date': row['date'],
                'journal_reference': row['reference'] or '',
                'amount': row['amount'],
                'category': row['account_name'],
                'severity': 'low',
                'risk_score': 0.3,
                'reasoning': f"High value round number ({row['amount']}) with vague description."
            }
        )
        anomalies_count += 1

    # --- DETECTION 3: Potential Duplicates ---
    duplicates = df[df.duplicated(subset=['amount', 'date', 'company_uuid'], keep=False)]
    for _, row in duplicates.iterrows():
        FinancialAnomaly.objects.get_or_create(
            journal_entry_id=row['entry_id'],
            anomaly_type='duplicate_entry',
            defaults={
                'company_uuid': row['company_uuid'],
                'journal_date': row['date'],
                'journal_reference': row['reference'] or '',
                'amount': row['amount'],
                'category': row['account_name'],
                'severity': 'medium',
                'risk_score': 0.6,
                'reasoning': f"Detected another transaction with the same amount {row['amount']} on the same day."
            }
        )
        anomalies_count += 1

    return f"Analysis complete. Detected/Updated {anomalies_count} anomalies."
