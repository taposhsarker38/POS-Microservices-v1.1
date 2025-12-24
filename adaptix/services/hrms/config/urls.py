from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django_prometheus.exports import ExportToDjangoView

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
    path('api/hrms/employees/', include('apps.employees.urls')),
    path('api/hrms/attendance/', include('apps.attendance.urls')),
    path('api/hrms/payroll/', include('apps.payroll.urls')),
    path('api/hrms/notices/', include('apps.noticeboard.urls')),
    path('api/hrms/shifts/', include('apps.shifts.urls')),
    path('api/hrms/leaves/', include('apps.leaves.urls')),
    path('api/hrms/performance/', include('apps.performance.urls')),
    path('api/hrms/projects/', include('apps.projects.urls')),
    path('metrics/', ExportToDjangoView, name='prometheus-metrics'),
]
