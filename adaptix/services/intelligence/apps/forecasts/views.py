from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
import pandas as pd
from prophet import Prophet
from .models import SalesForecast
from datetime import datetime
import io

class SalesForecastView(APIView):
    def post(self, request):
        # 1. Fetch data from POS schema directly using raw SQL
        # Note: 'pos' schema table 'sales_order'
        query = """
            SELECT created_at as ds, grand_total as y
            FROM pos.sales_order
            WHERE status != 'cancelled'
        """
        try:
            # Pandas read_sql matches columns to DataFrame
            df = pd.read_sql(query, connection)
            if df.empty:
                return Response({"message": "No sales data found to forecast"}, status=400)
                
            # 2. Preprocess
            df['ds'] = pd.to_datetime(df['ds']).dt.tz_localize(None) 
            # Aggregate by day
            df = df.groupby(pd.Grouper(key='ds', freq='D')).sum().reset_index()
            
            # Need at least 2 data points
            if len(df) < 2:
                 return Response({"message": "Not enough data points for forecasting"}, status=400)

            # 3. Train Prophet
            m = Prophet()
            m.fit(df)
            
            # 4. Predict next 30 days
            future = m.make_future_dataframe(periods=30)
            forecast = m.predict(future)
            
            # 5. Save/Update DB
            # We only care about future 30 days for now
            last_30 = forecast.tail(30)
            
            # Clean old forecasts? Let's clear for now to show latest projection
            SalesForecast.objects.all().delete()
            
            forecast_objects = []
            for index, row in last_30.iterrows():
                forecast_objects.append(SalesForecast(
                    date=row['ds'].date(),
                    predicted_sales=row['yhat'],
                    confidence_lower=row['yhat_lower'],
                    confidence_upper=row['yhat_upper']
                ))
            
            SalesForecast.objects.bulk_create(forecast_objects)
            
            return Response({"message": "Forecast generated successfully", "days_forecasted": 30})
            
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def get(self, request):
        forecasts = SalesForecast.objects.all().order_by('date')
        data = [
            {
                "date": f.date, 
                "predicted_sales": round(f.predicted_sales, 2),
                "lower": round(f.confidence_lower, 2),
                "upper": round(f.confidence_upper, 2)
            } 
            for f in forecasts
        ]
        return Response(data)
