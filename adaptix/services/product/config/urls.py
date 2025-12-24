from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from django.http import JsonResponse
import os

def health_check(request):
    return JsonResponse({'status': 'healthy'})

urlpatterns = [
    path('health/', health_check),
    path('admin/', admin.site.urls),
    path('api/product/', include('apps.products.urls')), # Main app URLs
    
    # OpenAPI
    path('api/product/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/product/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
