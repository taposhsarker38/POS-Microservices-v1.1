from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from adaptix_core.permissions import HasPermission
from .models import Notification
from .serializers import NotificationSerializer

import uuid

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [HasPermission]
    required_permission = "view_notification"

    def get_queryset(self):
        # Filter by current user (extracted from JWT via middleware)
        user_id = self.request.user_claims.get('user_id') if hasattr(self.request, 'user_claims') else None
        if not user_id:
            return Notification.objects.none()
            
        # Validate UUID to prevent crash on non-UUID user_id (e.g. "1")
        try:
            uuid.UUID(str(user_id))
        except (ValueError, AttributeError, TypeError):
            return Notification.objects.none()
            
        return Notification.objects.filter(user_id=user_id)

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['post'], url_path='read-all')
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all marked as read'})
