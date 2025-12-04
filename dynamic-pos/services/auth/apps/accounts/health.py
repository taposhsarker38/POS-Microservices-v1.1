from django.db import connection
import socket
import redis
import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from .utils.api import api_response
from rest_framework import status as http_status

@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    # DB check
    db_ok = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            db_ok = cursor.fetchone()[0] == 1
    except Exception:
        db_ok = False

    # Redis check (optional - if you use REDIS_URL env)
    redis_ok = False
    try:
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        r = redis.from_url(redis_url)
        redis_ok = (r.ping() is True)
    except Exception:
        redis_ok = False

    overall_ok = db_ok and redis_ok
    data = {
        "db": db_ok,
        "redis": redis_ok,
        "service": "auth",
        "uptime": None 
    }
    return api_response(data=data,
                        message="OK" if overall_ok else "DEGRADED",
                        success=overall_ok,
                        status_code=http_status.HTTP_200_OK if overall_ok else http_status.HTTP_503_SERVICE_UNAVAILABLE)
