from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import Camera, FootfallStats, PresenceLog, VisualCart
import logging

logger = logging.getLogger(__name__)

class CCTVEventReceiver(APIView):
    """
    Unified endpoint for receiving external AI Vision events.
    Supports events: 'entry_exit', 'identified', 'item_detected'.
    """
    def post(self, request):
        camera_uuid = request.data.get('camera_uuid')
        event_type = request.data.get('event_type')
        payload = request.data.get('payload', {})

        try:
            camera = Camera.objects.get(uuid=camera_uuid)
        except Camera.DoesNotExist:
            return Response({"error": "Camera not found"}, status=status.HTTP_404_NOT_FOUND)

        if event_type == 'entry_exit':
            # Logic for Retail Footfall (Aggregation)
            entries = payload.get('entries', 0)
            exits = payload.get('exits', 0)
            now = timezone.now().replace(minute=0, second=0, microsecond=0)
            stats, _ = FootfallStats.objects.get_or_create(camera=camera, timestamp=now)
            stats.entries += entries
            stats.exits += exits
            stats.save()

        elif event_type == 'identified':
            # Logic for Office/Factory Presence (Event Logging)
            person_id = payload.get('person_id')
            person_type = payload.get('person_type', 'VISITOR')
            direction = payload.get('direction', 'IN') # 'IN' or 'OUT'
            
            PresenceLog.objects.create(
                camera=camera,
                person_id=person_id,
                person_type=person_type,
                direction=direction,
                metadata=payload.get('metadata', {})
            )

        elif event_type == 'item_detected':
            # Logic for Retail Smart Cart
            session_id = payload.get('session_id')
            item_id = payload.get('product_id')
            terminal_id = payload.get('terminal_id')
            cart, _ = VisualCart.objects.get_or_create(session_id=session_id)
            cart.camera = camera
            if terminal_id:
                cart.pos_terminal_id = terminal_id
            if item_id not in cart.detected_items:
                cart.detected_items.append(item_id)
            cart.save()

        return Response({"status": "event_processed"}, status=status.HTTP_200_OK)

class PresenceAnalytics(APIView):
    """
    Filtered analytics for Office/Factory personnel tracking.
    Supports filters: branch_uuid, person_type, start_date, end_date.
    """
    def get(self, request):
        branch_uuid = request.query_params.get('branch_uuid')
        person_type = request.query_params.get('person_type')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        queryset = PresenceLog.objects.all().select_related('camera')

        if branch_uuid:
            queryset = queryset.filter(camera__branch_uuid=branch_uuid)
        if person_type:
            queryset = queryset.filter(person_type=person_type)
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)

        logs = queryset.order_by('-timestamp')[:100] # Limit for performance
        
        # Determine environment type for the branch
        env_type = "OFFICE"
        if branch_uuid:
            camera = Camera.objects.filter(branch_uuid=branch_uuid).first()
            if camera:
                env_type = camera.environment_type

        data = [{
            "id": log.id,
            "person_id": log.person_id,
            "person_type": log.person_type,
            "camera": log.camera.name,
            "direction": log.direction,
            "timestamp": log.timestamp,
            "metadata": log.metadata
        } for log in logs]

        return Response({
            "env_type": env_type,
            "logs": data
        }, status=status.HTTP_200_OK)

class VisualCartSync(APIView):
    """
    Endpoint for POS terminals to claim visual carts.
    Logic: Cashier types a session/bin ID or terminal is auto-linked.
    """
    def get(self, request):
        terminal_id = request.query_params.get('terminal_id')
        session_id = request.query_params.get('session_id') # Bin/Session ID from vision

        if session_id:
            try:
                cart = VisualCart.objects.get(session_id=session_id)
                # Allow retrieving already converted carts for review
            except VisualCart.DoesNotExist:
                return Response({"error": "Cart not found"}, status=404)
        elif terminal_id:
            # Fetch latest unconverted cart for this terminal
            cart = VisualCart.objects.filter(pos_terminal_id=terminal_id, is_converted=False).order_by('-updated_at').first()
            if not cart:
                # Create a specific mock cart for demo if none exists
                cart = VisualCart.objects.create(
                     session_id=f"demo-{uuid.uuid4()}",
                     pos_terminal_id=terminal_id,
                     detected_items=["smart-water-500ml", "lays-classic-small"]
                )
        else:
            return Response({"error": "Terminal or Session ID required"}, status=400)

        # Enrich items (Mocking Product Service lookup for Demo)
        enriched_items = []
        for item_id in cart.detected_items:
            # In production, call Product Service via gRPC/HTTP
            if "water" in item_id:
                 enriched_items.append({
                     "id": "prod-uuid-water-123",
                     "name": "Smart Water 500ml",
                     "sku": "SW-500",
                     "sales_price": 1.50,
                     "quantity": 1
                 })
            elif "lays" in item_id:
                 enriched_items.append({
                     "id": "prod-uuid-lays-456",
                     "name": "Lays Classic Small",
                     "sku": "LAY-S",
                     "sales_price": 0.80,
                     "quantity": 2 # AI detected 2 bags
                 })
            else:
                 enriched_items.append({
                     "id": f"prod-{uuid.uuid4()}",
                     "name": "Unknown Item",
                     "sku": "UNKNOWN",
                     "sales_price": 5.00,
                     "quantity": 1
                 })

        return Response({
            "session_id": cart.session_id,
            "items": enriched_items, 
            "updated_at": cart.updated_at
        })

    def post(self, request):
        """Mark cart as converted once the POS order is finalized."""
        session_id = request.data.get('session_id')
        try:
            cart = VisualCart.objects.get(session_id=session_id)
            cart.is_converted = True
            cart.save()
            return Response({"status": "cart_converted"})
        except VisualCart.DoesNotExist:
            return Response({"error": "Cart not found"}, status=404)

from django.db.models import Sum, Count, Q
from datetime import timedelta

class VisionStatsView(APIView):
    """
    Provides aggregated metrics for the Vision Hub dashboard.
    """
    def get(self, request):
        branch_uuid = request.query_params.get('branch_uuid')
        if not branch_uuid:
            return Response({"error": "branch_uuid is required"}, status=400)

        cameras = Camera.objects.filter(branch_uuid=branch_uuid, is_active=True)
        camera_ids = cameras.values_list('id', flat=True)

        # 1. Active Cameras
        active_count = cameras.count()

        # 2. Today's Total Visitors / On-Site (Simplified)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        presence_today = PresenceLog.objects.filter(
            camera_id__in=camera_ids, 
            timestamp__gte=today_start
        )
        
        # Simplified "Inside Premises" logic: count unique persons who entered and haven't left
        # In a real scenario, this would be more complex and persistent.
        on_site_count = presence_today.filter(direction='IN').values('person_id').distinct().count()

        # 3. Conversion Rate (Placeholder or simple log-based calc)
        # We can calculate it as (Converted Carts / Total Entries)
        footfall_entries = FootfallStats.objects.filter(
            camera_id__in=camera_ids,
            timestamp__gte=today_start
        ).aggregate(total=Sum('entries'))['total'] or 0
        
        converted_carts = VisualCart.objects.filter(
            camera_id__in=camera_ids,
            is_converted=True,
            created_at__gte=today_start
        ).count()
        
        conversion_rate = (converted_carts / footfall_entries * 100) if footfall_entries > 0 else 0

        # 4. Security Status
        unauthorized_recent = PresenceLog.objects.filter(
            camera_id__in=camera_ids,
            person_type='UNAUTHORIZED',
            timestamp__gte=timezone.now() - timedelta(hours=1)
        ).exists()

        # 5. Current Absences (Employees marked as OUT but not yet IN, or out for > 10 mins)
        ten_mins_ago = timezone.now() - timedelta(minutes=10)
        
        # Get latest log for each employee today
        latest_logs = PresenceLog.objects.filter(
            camera_id__in=camera_ids,
            person_type='EMPLOYEE',
            timestamp__gte=today_start
        ).order_by('person_id', '-timestamp').distinct('person_id')
        
        absent_count = 0
        for log in latest_logs:
            if log.direction == 'OUT' and log.timestamp < ten_mins_ago:
                absent_count += 1

        return Response({
            "env_type": cameras.first().environment_type if cameras.exists() else "OFFICE",
            "active_cameras": active_count,
            "on_site_now": on_site_count,
            "absent_count": absent_count,
            "conversion_rate": round(conversion_rate, 1),
            "security_status": "ALERT" if unauthorized_recent else "SECURE"
        })

class FootfallAnalyticsView(APIView):
    """
    Returns hourly footfall data for chart rendering.
    """
    def get(self, request):
        branch_uuid = request.query_params.get('branch_uuid')
        date_str = request.query_params.get('date') # YYYY-MM-DD
        
        if not branch_uuid:
            return Response({"error": "branch_uuid is required"}, status=400)
            
        target_date = timezone.now().date()
        if date_str:
            target_date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()

        camera_ids = Camera.objects.filter(branch_uuid=branch_uuid).values_list('id', flat=True)
        
        stats = FootfallStats.objects.filter(
            camera_id__in=camera_ids,
            timestamp__date=target_date
        ).order_by('timestamp')

        # Aggregate by hour
        # Returns [ {hour: 0, entries: 10, exits: 5}, ... ]
        data = []
        for s in stats:
            data.append({
                "hour": s.timestamp.hour,
                "entries": s.entries,
                "exits": s.exits
            })

        return Response({
            "env_type": env_type,
            "logs": data
        })

class MovementTrackingView(APIView):
    """
    Analyzes IN/OUT sessions for employees to calculate absence durations.
    """
    def get(self, request):
        branch_uuid = request.query_params.get('branch_uuid')
        person_id = request.query_params.get('person_id')
        
        if not branch_uuid:
            return Response({"error": "branch_uuid is required"}, status=400)
            
        logs = PresenceLog.objects.filter(
            camera__branch_uuid=branch_uuid,
            person_type='EMPLOYEE'
        ).order_by('person_id', 'timestamp')
        
        if person_id:
            logs = logs.filter(person_id=person_id)

        sessions = []
        last_out = {} # Map person_id -> timestamp

        for log in logs:
            p_id = log.person_id
            if log.direction == 'OUT':
                last_out[p_id] = log.timestamp
            elif log.direction == 'IN' and p_id in last_out:
                duration = (log.timestamp - last_out[p_id]).total_seconds() / 60
                sessions.append({
                    "person_id": p_id,
                    "out_time": last_out[p_id],
                    "in_time": log.timestamp,
                    "duration_minutes": round(duration, 1),
                    "is_long_absence": duration > 10,
                    "status": log.metadata.get('leave_status', 'Regular Break')
                })
                del last_out[p_id]

        return Response(sessions)

class ManualVisionEntry(APIView):
    """
    Endpoint for authorized users to manually log vision events.
    Useful for hardware failures or power outages.
    """
    def post(self, request):
        entry_type = request.data.get('entry_type') # 'footfall' or 'presence'
        branch_uuid = request.data.get('branch_uuid')
        
        # Try to find a default camera for this branch or create a 'Manual Entry' camera
        camera, _ = Camera.objects.get_or_create(
            branch_uuid=branch_uuid,
            name="Manual Entry Log",
            defaults={"environment_type": "OFFICE", "is_active": False}
        )

        if entry_type == 'footfall':
            entries = int(request.data.get('entries', 0))
            exits = int(request.data.get('exits', 0))
            timestamp = request.data.get('timestamp', timezone.now())
            
            # Ensure hourly granularity for FootfallStats
            if isinstance(timestamp, str):
                timestamp = timezone.datetime.fromisoformat(timestamp)
            
            hourly_ts = timestamp.replace(minute=0, second=0, microsecond=0)
            
            stats, _ = FootfallStats.objects.get_or_create(
                camera=camera, 
                timestamp=hourly_ts,
                defaults={"source": "MANUAL"}
            )
            stats.entries += entries
            stats.exits += exits
            stats.source = 'MANUAL'
            stats.save()
            
            return Response({"status": "footfall_logged_manually"})

        elif entry_type == 'presence':
            person_id = request.data.get('person_id')
            person_type = request.data.get('person_type', 'VISITOR')
            
            # Auto-map to CUSTOMER if retail site and manually selected as visitor? 
            # Or just let front-end decide. Let's let front-end decide but allow the type.
            direction = request.data.get('direction', 'IN')
            leave_status = request.data.get('leave_status', 'Regular Break')
            
            PresenceLog.objects.create(
                camera=camera,
                person_id=person_id,
                person_type=person_type,
                direction=direction,
                source='MANUAL',
                metadata={"reason": "Manual fallback entry", "leave_status": leave_status}
            )
            return Response({"status": "presence_logged_manually"})

        return Response({"error": "Invalid entry type"}, status=400)
