from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AssetCategory, Asset, DepreciationSchedule, AssetTelemetry, AssetMaintenanceTask
from .serializers import (
    AssetCategorySerializer, AssetSerializer, DepreciationScheduleSerializer,
    AssetTelemetrySerializer, AssetMaintenanceTaskSerializer
)

class AssetCategoryViewSet(viewsets.ModelViewSet):
    queryset = AssetCategory.objects.all()
    serializer_class = AssetCategorySerializer

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer

    def perform_create(self, serializer):
        # Initial value is purchase cost
        serializer.save(current_value=serializer.validated_data['purchase_cost'])

    @action(detail=True, methods=['get'], url_path='health-metrics')
    def health_metrics(self, request, pk=None):
        """Aggregate data for the Asset Health Dashboard."""
        asset = self.get_object()
        telemetry = asset.telemetry.all()[:50] # Last 50 readings
        tasks = asset.maintenance_tasks.all()
        
        return Response({
            "asset_id": asset.id,
            "asset_name": asset.name,
            "status": asset.status,
            "telemetry_history": AssetTelemetrySerializer(telemetry, many=True).data,
            "maintenance_history": AssetMaintenanceTaskSerializer(tasks, many=True).data,
        })

    @action(detail=True, methods=['post'], url_path='calculate-depreciation')
    def calculate_depreciation(self, request, pk=None):
        """
        Calculate depreciation for the asset and publish event.
        Simple straight-line for this MVP.
        """
        asset = self.get_object()
        company_uuid = asset.company_uuid
        
        # Logic: 
        # Annual Dep = (Cost - Residual) / Life
        # Monthly = Annual / 12
        # For MVP, assume 0 residual value
        
        cost = asset.purchase_cost
        life_years = asset.category.useful_life_years
        
        if life_years <= 0:
            return Response({"error": "Invalid useful life"}, status=status.HTTP_400_BAD_REQUEST)
            
        annual_depreciation = cost / life_years
        monthly_depreciation = annual_depreciation / 12
        
        # Create Schedule
        from django.utils import timezone
        today = timezone.now().date()
        
        # Check if already depreciated for this month
        if DepreciationSchedule.objects.filter(asset=asset, date__month=today.month, date__year=today.year).exists():
           return Response({"error": "Already depreciated this month"}, status=status.HTTP_400_BAD_REQUEST)

        # Update Asset Value
        opening_value = asset.current_value
        closing_value = opening_value - monthly_depreciation
        
        if closing_value < 0:
            closing_value = 0
            monthly_depreciation = opening_value # Cap it
            
        asset.current_value = closing_value
        asset.save()
        
        schedule = DepreciationSchedule.objects.create(
            asset=asset,
            date=today,
            amount=monthly_depreciation,
            opening_value=opening_value,
            closing_value=closing_value,
            is_posted=True # We will post via event
        )
        
        # Publish Event
        try:
            from kombu import Connection, Exchange, Producer
            import os
            import json
            from django.conf import settings
            
            BROKER_URL = getattr(settings, 'CELERY_BROKER_URL', "amqp://guest:guest@rabbitmq:5672/")
            connection = Connection(BROKER_URL)
            connection.connect()
            
            exchange = Exchange("events", type="topic", durable=True)
            producer = Producer(connection)
            
            event_payload = {
                "event": "asset.depreciation",
                "asset_id": str(asset.id),
                "asset_name": asset.name,
                "company_uuid": str(company_uuid),
                "amount": str(monthly_depreciation),
                "date": str(today),
                "schedule_id": str(schedule.id)
            }
            
            producer.publish(
                json.dumps(event_payload),
                exchange=exchange,
                routing_key="asset.depreciation",
                declare=[exchange],
                retry=True
            )
            connection.release()
            print(f"Published asset.depreciation event for Asset {asset.code}")
            
        except Exception as e:
            print(f"Failed to publish depreciation event: {e}")
            # Non-blocking for now, but in prod should rollback
            
        return Response(DepreciationScheduleSerializer(schedule).data)

class DepreciationScheduleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DepreciationSchedule.objects.all()
    serializer_class = DepreciationScheduleSerializer

class AssetTelemetryViewSet(viewsets.ModelViewSet):
    queryset = AssetTelemetry.objects.all()
    serializer_class = AssetTelemetrySerializer
    filterset_fields = ['asset']

class AssetMaintenanceTaskViewSet(viewsets.ModelViewSet):
    queryset = AssetMaintenanceTask.objects.all()
    serializer_class = AssetMaintenanceTaskSerializer
    filterset_fields = ['asset', 'status', 'company_uuid']

    def perform_create(self, serializer):
        # Support fallback if company_uuid not provided in body
        company_uuid = self.request.data.get('company_uuid') or getattr(self.request, "company_uuid", None)
        serializer.save(company_uuid=company_uuid)
