from django.utils.deprecation import MiddlewareMixin
from .models import AuditLog

class AuditMiddleware(MiddlewareMixin):
    def process_request(self, request):
        try:
            request._saved_body = request.body.decode('utf-8')
        except:
            request._saved_body = ""

    def process_response(self, request, response):
        try:
            user = getattr(request, "user", None)
            AuditLog.objects.create(
                user = user if user and user.is_authenticated else None,
                path = request.path[:400],
                method = request.method,
                status_code = getattr(response, "status_code", 0),
                request_body = (getattr(request, "_saved_body", "") or "")[:2000],
                response_body = getattr(response, "content", b"")[:2000].decode('utf-8', errors='ignore'),
                ip = request.META.get("REMOTE_ADDR"),
                user_agent = request.META.get("HTTP_USER_AGENT", "")[:512],
            )
        except Exception:
            pass
        return response
