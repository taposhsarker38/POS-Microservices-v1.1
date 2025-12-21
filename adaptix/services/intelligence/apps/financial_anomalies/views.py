from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from adaptix_core.middleware import JWTCompanyMiddleware
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import random
from datetime import datetime, timedelta

class FinancialAnomalyView(APIView):
    # permission_classes = [IsAuthenticated] # Disabled, we use manual claim check via Middleware
    permission_classes = []

    def get(self, request):
        # Check authentication from Middleware
        claims = getattr(request, 'user_claims', {})
        if not claims:
             return Response({'detail': 'Authentication required'}, status=401)

        # MOCK DATA GENERATION (Simulating an external Accounting API call)
        # In a real scenario, we would stream this from Kafka or query the Accounting Service
        
        categories = ['Rent', 'Utilities', 'Salaries', 'Server Costs', 'Marketing', 'Travel']
        data = []
        
        # Generate 100 "normal" transactions
        for _ in range(100):
            cat = random.choice(categories)
            base_amount = 500 if cat != 'Salaries' else 5000
            data.append({
                'date': (datetime.now() - timedelta(days=random.randint(1, 60))).strftime('%Y-%m-%d'),
                'category': cat,
                'amount': max(10, int(np.random.normal(base_amount, base_amount * 0.1))),
                'description': f'Regular {cat} Payment'
            })
            
        # INJECT ANOMALIES (The "Pain Point" we are solving)
        anomalies = [
            # High outlier
            {
                'date': datetime.now().strftime('%Y-%m-%d'), 
                'category': 'Travel', 
                'amount': 2500, # 5x normal 500
                'description': 'Last Minute Flight to Mars'
            },
             # Spike
             {
                'date': datetime.now().strftime('%Y-%m-%d'), 
                'category': 'Server Costs', 
                'amount': 4500, # Huge spike
                'description': 'Unexpected AWS Surge'
            }
        ]
        data.extend(anomalies)
        
        df = pd.DataFrame(data)
        
        # PREPARE FOR ML
        # We focus on 'amount' for anomaly detection
        X = df[['amount']].values
        
        # TRAIN MODEL (Isolation Forest)
        # contamination=0.02 means we expect ~2% anomalies
        clf = IsolationForest(contamination=0.02, random_state=42)
        clf.fit(X)
        
        # PREDICT
        df['anomaly'] = clf.predict(X) 
        df['score'] = clf.decision_function(X)
        
        # Filter only anomalies (-1 indicates anomaly)
        outliers = df[df['anomaly'] == -1].to_dict(orient='records')
        
        # Format for frontend
        results = []
        for out in outliers:
            results.append({
                "id": str(random.randint(1000, 9999)),
                "date": out['date'],
                "category": out['category'],
                "amount": out['amount'],
                "description": out['description'],
                "severity": "high" if out['amount'] > 2000 else "medium",
                "message": f"{out['category']} is significantly higher than average."
            })
            
        return Response({
            "status": "success",
            "anomalies_detected": len(results),
            "data": results
        })
