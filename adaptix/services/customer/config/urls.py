from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'healthy'})

urlpatterns = [
    path('health/', health_check),
    path('admin/', admin.site.urls),
    # OpenAPI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # App URLs
    path('api/customer/', include('apps.profiles.urls')),
    path('api/customer/loyalty/', include('apps.loyalty.urls')),
    path('api/crm/', include('apps.crm.urls')),
]
