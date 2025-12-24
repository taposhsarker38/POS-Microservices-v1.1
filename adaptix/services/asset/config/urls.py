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
    path('api/asset/docs/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/asset/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    path('api/asset/', include('apps.assets.urls')),
]
