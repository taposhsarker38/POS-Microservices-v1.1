from rest_framework.views import APIView
from rest_framework.response import Response
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class SalesTrendView(APIView):
    # Public endpoint or secured via Middleware depending on requirements (currently matching POS pattern)
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        # 1. Generate Synthetic Historical Data (Last 6 Months)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)
        dates = pd.date_range(start=start_date, end=end_date)
        
        # Base trend: steady growth
        x = np.linspace(0, 10, len(dates))
        base_sales = 500 + (x * 50) # Start at 500, end at 1000 daily
        
        # Seasonality: Weekly spikes (Friday/Saturday)
        seasonality = []
        for d in dates:
            if d.weekday() >= 4: # Fri, Sat, Sun
                seasonality.append(np.random.normal(200, 50))
            else:
                seasonality.append(np.random.normal(0, 50))
                
        daily_sales = base_sales + np.array(seasonality)
        daily_sales = np.maximum(daily_sales, 0) # No negative sales
        
        # Create DataFrame
        df = pd.DataFrame({'date': dates, 'sales': daily_sales})
        
        # 2. Aggregations for Widget
        
        # Weekly Sparkline (Last 7 days)
        last_7_days = df.tail(7)
        sparkline = last_7_days[['date', 'sales']].to_dict(orient='records')
        # Format dates for frontend
        for item in sparkline:
            item['date'] = item['date'].strftime('%a') # Mon, Tue...
            item['sales'] = int(item['sales'])

        # Monthly Growth
        current_month_sales = df[df['date'] >= (end_date - timedelta(days=30))]['sales'].sum()
        prev_month_sales = df[(df['date'] >= (end_date - timedelta(days=60))) & (df['date'] < (end_date - timedelta(days=30)))]['sales'].sum()
        
        growth_rate = 0
        if prev_month_sales > 0:
            growth_rate = ((current_month_sales - prev_month_sales) / prev_month_sales) * 100
            
        # 3. Top Movers (Synthetic)
        products = ['Latte', 'Espresso', 'Croissant', 'Muffin', 'Sandwich']
        movers = []
        for p in products:
            change = np.random.randint(-15, 30)
            movers.append({
                'name': p,
                'change': change,
                'trend': 'up' if change > 0 else 'down'
            })
        movers.sort(key=lambda x: x['change'], reverse=True)

        return Response({
            "status": "success",
            "summary": {
                "total_sales_30d": int(current_month_sales),
                "growth_rate": round(growth_rate, 1),
                "trend_direction": "up" if growth_rate > 0 else "down"
            },
            "sparkline": sparkline,
            "top_movers": movers[:3]
        })
