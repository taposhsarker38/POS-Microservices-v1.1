from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.http import JsonResponse
from django_prometheus.exports import ExportToDjangoView

def health_check(request):
    return JsonResponse({'status': 'healthy', 'service': 'logistics'})

urlpatterns = [
    path('health/', health_check),
    path('api/logistics/health/', health_check),
    path('metrics/', ExportToDjangoView, name='prometheus-metrics'),
    path('admin/', admin.site.urls),
    path('api/logistics/', include('apps.shipping.urls')),
    
    # OpenAPI
    path('api/logistics/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/logistics/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
