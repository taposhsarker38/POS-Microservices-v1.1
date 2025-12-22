from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.decorators import action
from django.db import connection
import pandas as pd
from .models import InventoryOptimization
from .serializers import InventoryOptimizationSerializer
from .tasks import analyze_stockout_risk
from apps.forecasts.models import SalesForecast
from datetime import date, timedelta

class InventoryOptimizationViewSet(viewsets.ModelViewSet):
    serializer_class = InventoryOptimizationSerializer

    def get_queryset(self):
        company_uuid = self.request.user_claims.get('company_uuid')
        queryset = InventoryOptimization.objects.filter(company_uuid=company_uuid)
        if product_uuid := self.request.query_params.get('product_uuid'):
            queryset = queryset.filter(product_uuid=product_uuid)
        return queryset

    @action(detail=False, methods=['post'])
    def trigger_analysis(self, request):
        company_uuid = request.user_claims.get('company_uuid')
        
        # Delay the task to Celery
        analyze_stockout_risk.delay(company_uuid=company_uuid)
        
        return Response({
            "status": "Accepted", 
            "message": "Stockout risk analysis has been queued."
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['get'], url_path='prediction-details')
    def prediction_details(self, request):
        """
        Returns daily stock projection for a specific product.
        Query params: product_uuid
        """
        product_uuid = request.query_params.get('product_uuid')
        company_uuid = request.user_claims.get('company_uuid')
        
        if not product_uuid:
            return Response({"error": "product_uuid is required"}, status=400)
            
        # 1. Get current snapshot
        try:
            opt = InventoryOptimization.objects.get(
                company_uuid=company_uuid, 
                product_uuid=product_uuid
            )
            current_stock = opt.current_stock
        except InventoryOptimization.DoesNotExist:
            return Response({"error": "Optimization data not found for this product"}, status=404)
            
        # 2. Get forecasts
        forecasts = SalesForecast.objects.filter(
            company_uuid=company_uuid,
            product_uuid=product_uuid,
            date__gte=date.today(),
            forecast_type='sales'
        ).order_by('date')
        
        if not forecasts.exists():
             return Response({"error": "No forecast data generated yet"}, status=404)
             
        # 3. Simulate depletion
        projection = []
        running_stock = current_stock
        
        for f in forecasts:
            running_stock -= f.predicted_sales
            projection.append({
                "date": f.date,
                "predicted_sales": round(f.predicted_sales, 2),
                "projected_stock": round(running_stock, 2),
                "confidence_lower": f.confidence_lower,
                "confidence_upper": f.confidence_upper
            })
            
        return Response({
            "product_uuid": product_uuid,
            "current_stock": current_stock,
            "risk_score": opt.stockout_risk_score,
            "estimated_stockout_date": opt.estimated_stockout_date,
            "projection": projection
        })

class ReorderPointView(APIView):
    def post(self, request):
        # 1. Fetch sales consumption data (last 90 days)
        # Note: 'pos' schema table 'sales_order_item' joined with 'sales_order'
        query = """
            SELECT 
                i.product_uuid, 
                o.branch_id, 
                i.quantity, 
                o.created_at::date as sale_date
            FROM pos.sales_order_item i
            JOIN pos.sales_order o ON i.order_id = o.id
            WHERE o.status != 'cancelled' 
            AND o.created_at >= NOW() - INTERVAL '90 days'
        """
        
        try:
            df = pd.read_sql(query, connection)
            if df.empty:
                return Response({"message": "No consumption data found"}, status=400)

            # 2. Calculate Daily Consumption Rate per Product/Branch
            # Group by Product, Branch, Date -> Sum Quantity
            daily_usage = df.groupby(['product_uuid', 'branch_id', 'sale_date'])['quantity'].sum().reset_index()
            
            # Average Daily Usage (ADU)
            # Group by Product, Branch -> Mean Quantity
            adu = daily_usage.groupby(['product_uuid', 'branch_id'])['quantity'].mean().reset_index()
            adu.rename(columns={'quantity': 'avg_daily_usage'}, inplace=True)
            
            # 3. Calculate Reorder Point (ROP) & Economic Order Quantity (EOQ) - simplified
            # Assumption: Lead Time = 7 days (Configurable later)
            # Assumption: Safety Stock factor = 1.5 * ADU
            LEAD_TIME_DAYS = 7
            SAFETY_FACTOR = 1.5
            
            optimizations = []
            
            # Clear old records
            InventoryOptimization.objects.all().delete()
            
            for index, row in adu.iterrows():
                product_uuid = row['product_uuid']
                branch_uuid = row['branch_id'] # Can be NaN/None
                avg_usage = row['avg_daily_usage']
                
                if pd.isna(branch_uuid):
                    branch_uuid = None
                
                safety_stock = avg_usage * SAFETY_FACTOR
                reorder_point = (avg_usage * LEAD_TIME_DAYS) + safety_stock
                reorder_qty = reorder_point * 2 # Simple heuristic: 2 cycles worth
                
                optimizations.append(InventoryOptimization(
                    product_uuid=product_uuid,
                    branch_id=branch_uuid,
                    current_stock=0, # Need to fetch actual stock from Inventory service (skipped for now or mocked)
                    avg_daily_consumption=avg_usage,
                    suggested_reorder_point=int(reorder_point),
                    suggested_reorder_qty=int(reorder_qty)
                ))
            
            InventoryOptimization.objects.bulk_create(optimizations)
            
            return Response({
                "message": "Inventory levels optimized", 
                "products_analyzed": len(optimizations)
            })

        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def get(self, request):
        items = InventoryOptimization.objects.all()
        data = [
            {
                "product_uuid": item.product_uuid,
                "branch_id": item.branch_id,
                "avg_daily_consumption": round(item.avg_daily_consumption, 2),
                "suggested_reorder_point": item.suggested_reorder_point,
                "suggested_reorder_qty": item.suggested_reorder_qty
            }
            for item in items
        ]
        return Response(data)
