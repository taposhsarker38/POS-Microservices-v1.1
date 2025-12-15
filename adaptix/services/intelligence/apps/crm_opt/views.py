from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
import pandas as pd
from .models import CustomerSegmentation
from datetime import datetime

class RFMView(APIView):
    def post(self, request):
        # 1. Fetch sales data linked to customers
        # Assumption: pos.sales_order has customer_email or we key off something unique.
        # Ideally, we should sync Customer UUIDs, but let's assume 'customer_id' as string in SalesOrder for now or email.
        # Let's check SalesOrder model... it usually has customer_id (UUID). 
        # But for 'Intelligence' service to be robust, we treat it as raw string ID.
        
        query = """
            SELECT 
                customer_uuid as customer_id,
                MAX(created_at) as last_purchase_date,
                COUNT(id) as frequency,
                SUM(grand_total) as monetary
            FROM pos.sales_order
            WHERE status != 'cancelled' 
            AND customer_uuid IS NOT NULL
            GROUP BY customer_uuid
        """
        
        try:
            df = pd.read_sql(query, connection)
            if df.empty:
                return Response({"message": "No customer transaction data found"}, status=400)

            # 2. Calculate Recency
            now = datetime.now()
            # Convert to datetime if not already
            df['last_purchase_date'] = pd.to_datetime(df['last_purchase_date'])
            df['recency'] = (now - df['last_purchase_date']).dt.days
            
            # 3. Calculate Scores (Quartiles 1-4)
            # Recency: Lower is better (4 = newest, 1 = oldest) -> inverse logic usually but let's do 4=best
            # Frequency: Higher is better
            # Monetary: Higher is better
            
            # Simple qcut might fail if not enough unique values (e.g. all 1 order). 
            # We use rank method 'first' to force unique bins if needed, or try/except.
            
            try:
                df['R'] = pd.qcut(df['recency'], 4, labels=[4, 3, 2, 1]) # 4 = < 25% days (most recent)
                df['F'] = pd.qcut(df['frequency'].rank(method='first'), 4, labels=[1, 2, 3, 4])
                df['M'] = pd.qcut(df['monetary'].rank(method='first'), 4, labels=[1, 2, 3, 4])
            except Exception:
                # Fallback if too little data for 4 bins
                return Response({"message": "Not enough data for quartile analysis"}, status=400)

            df['RFM_Score'] = df['R'].astype(str) + df['F'].astype(str) + df['M'].astype(str)
            
            # 4. Define Segments
            def segment_customer(row):
                r = int(row['R'])
                f = int(row['F'])
                m = int(row['M'])
                fm_avg = (f + m) / 2
                
                if r >= 4 and fm_avg >= 4:
                    return "Champions"
                elif r >= 3 and fm_avg >= 3:
                    return "Loyal Customers"
                elif r >= 4 and fm_avg <= 2:
                    return "New Customers"
                elif r <= 2 and fm_avg >= 3:
                    return "At Risk"
                elif r <= 1 and fm_avg <= 2:
                    return "Lost"
                else:
                    return "Regular"

            df['Segment'] = df.apply(segment_customer, axis=1)
            
            # 5. Save to DB
            CustomerSegmentation.objects.all().delete()
            
            segments = []
            for index, row in df.iterrows():
                segments.append(CustomerSegmentation(
                    customer_email=str(row['customer_id']), # Storing ID as 'email' field for now, reusing field name or we should rename model field to customer_ref
                    recency=row['recency'],
                    frequency=row['frequency'],
                    monetary=row['monetary'],
                    r_score=row['R'],
                    f_score=row['F'],
                    m_score=row['M'],
                    segment_label=row['Segment']
                ))
            
            CustomerSegmentation.objects.bulk_create(segments)
            
            return Response({
                "message": "Customer segmentation completed", 
                "total_customers": len(segments),
                "segments": df['Segment'].value_counts().to_dict()
            })

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def get(self, request):
        segments = CustomerSegmentation.objects.all().order_by('-monetary')
        data = [
            {
                "customer": s.customer_email,
                "segment": s.segment_label,
                "metrics": {
                    "R": s.recency,
                    "F": s.frequency,
                    "M": float(s.monetary)
                }
            }
            for s in segments
        ]
        return Response(data)
