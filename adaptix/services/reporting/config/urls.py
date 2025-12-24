from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.http import JsonResponse
from django_prometheus.exports import ExportToDjangoView

def health_check(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('metrics/', ExportToDjangoView, name='prometheus-metrics'),
    # OpenAPI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # App URLs
    path('api/reporting/', include('apps.analytics.urls')),
]
