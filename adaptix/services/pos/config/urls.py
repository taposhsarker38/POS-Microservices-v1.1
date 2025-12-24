from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django_prometheus.exports import ExportToDjangoView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/pos/', include('apps.sales.urls')), # Main app URLs
    
    # OpenAPI
    path('api/pos/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/pos/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('metrics/', ExportToDjangoView, name='prometheus-metrics'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
