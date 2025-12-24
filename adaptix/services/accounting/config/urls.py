from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django_prometheus.exports import ExportToDjangoView

urlpatterns = [
    path('admin/', admin.site.urls),
    # OpenAPI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # App URLs
    path('api/accounting/ledger/', include('apps.ledger.urls')),
    path('api/accounting/tax/', include('apps.tax.urls')),
    path('metrics/', ExportToDjangoView, name='prometheus-metrics'),
]
