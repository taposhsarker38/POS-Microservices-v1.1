from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django_prometheus.exports import ExportToDjangoView
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('api/accounting/health/', health_check),
    # OpenAPI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # App URLs
    path('api/accounting/', include('apps.ledger.urls')),
    path('api/accounting/tax/', include('apps.tax.urls')),
    path('metrics/', ExportToDjangoView, name='prometheus-metrics'),
]
