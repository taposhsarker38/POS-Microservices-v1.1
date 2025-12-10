from apps.products.audit import audit_background

class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/"): # Only log API requests
            audit_background(request, response)
        return response
