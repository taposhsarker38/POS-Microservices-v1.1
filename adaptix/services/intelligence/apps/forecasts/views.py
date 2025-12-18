from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets
from .models import SalesForecast
from .serializers import SalesForecastSerializer
import pandas as pd
from prophet import Prophet
from datetime import datetime
import io
from django.db import connection

class SalesForecastViewSet(viewsets.ModelViewSet):
    queryset = SalesForecast.objects.all()
    serializer_class = SalesForecastSerializer

    # The original post method from SalesForecastView needs to be adapted
    # for a ViewSet. For now, we'll keep it as a custom action or
    # override the create method if it fits the ModelViewSet's CRUD operations.
    # Given the original post method generates forecasts, it's more like a custom action.
    # However, the instruction only provides the ViewSet definition, not the method migration.
    # So, I will keep the original methods in the old class for now,
    # and assume the user will integrate them later, or that the ViewSet
    # is meant for the GET/list functionality of the existing forecasts.

    # If the intent was to replace the entire SalesForecastView with SalesForecastViewSet,
    # the post method would need to be moved/adapted.
    # For now, I'll keep the original class and its methods as they are not explicitly removed
    # by the provided "Code Edit", which only adds the ViewSet.

# The original SalesForecastView class remains as it was not explicitly removed
# by the provided instruction. The instruction only added the ViewSet.
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
