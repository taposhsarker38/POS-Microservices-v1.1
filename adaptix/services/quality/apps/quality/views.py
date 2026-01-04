from rest_framework import viewsets
from .models import QualityStandard, Inspection, TestResult, DefectCategory, InspectionPhoto
from .serializers import (
    QualityStandardSerializer, InspectionSerializer, TestResultSerializer,
    DefectCategorySerializer, InspectionPhotoSerializer
)
from adaptix_core.permissions import HasPermission
import os
import json
from kombu import Connection, Exchange, Producer
from django.core.serializers.json import DjangoJSONEncoder

class DefectCategoryViewSet(viewsets.ModelViewSet):
    queryset = DefectCategory.objects.all()
    serializer_class = DefectCategorySerializer
    permission_classes = [HasPermission]
    required_permission = "quality.inspection"

class InspectionPhotoViewSet(viewsets.ModelViewSet):
    queryset = InspectionPhoto.objects.all()
    serializer_class = InspectionPhotoSerializer
    permission_classes = [HasPermission]
    required_permission = "quality.inspection"

class QualityStandardViewSet(viewsets.ModelViewSet):
    queryset = QualityStandard.objects.all()
    serializer_class = QualityStandardSerializer
    permission_classes = [HasPermission]
    required_permission = "quality.standard"

class InspectionViewSet(viewsets.ModelViewSet):
    queryset = Inspection.objects.all()
    serializer_class = InspectionSerializer
    permission_classes = [HasPermission]
    required_permission = "quality.inspection"
    
    def perform_update(self, serializer):
        instance = serializer.instance
        old_status = instance.status
        updated_instance = serializer.save()
        new_status = updated_instance.status
        
        if old_status != new_status and new_status in ['PASSED', 'REJECTED', 'FAILED']:
            self.publish_completion_event(updated_instance)

    def publish_completion_event(self, inspection):
        try:
            BROKER_URL = os.environ.get("RABBITMQ_URL", "amqp://adaptix:adaptix123@rabbitmq:5672/")
            connection = Connection(BROKER_URL)
            connection.connect()
            
            exchange = Exchange("events", type="topic", durable=True)
            producer = Producer(connection)
            
            event_payload = {
                "event": "quality.inspection.completed",
                "inspection_id": inspection.id,
                "reference_uuid": str(inspection.reference_uuid),
                "reference_type": inspection.reference_type,
                "status": inspection.status,
                "defect_category_name": inspection.defect_category.name if inspection.defect_category else None,
                "notes": inspection.notes,
                "inspection_date": inspection.inspection_date.isoformat(),
                "photo_urls": [p.photo_url for p in inspection.photos.all()]
            }
            
            producer.publish(
                json.dumps(event_payload, cls=DjangoJSONEncoder),
                exchange=exchange,
                routing_key="quality.inspection.completed",
                declare=[exchange],
                retry=True
            )
            connection.release()
            print(f"Published quality.inspection.completed event for {inspection.reference_uuid}")
            
        except Exception as e:
            print(f"Failed to publish Quality event: {e}")

class TestResultViewSet(viewsets.ModelViewSet):
    queryset = TestResult.objects.all()
    serializer_class = TestResultSerializer
    permission_classes = [HasPermission]
    required_permission = "quality.inspection"
