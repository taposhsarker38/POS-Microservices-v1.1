from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from apps.accounts import urls as accounts_urls
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView,SpectacularRedocView
from django_prometheus.exports import ExportToDjangoView
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include(accounts_urls)),
    path("api/auth/audit/", include("apps.audit.urls")),
    path("health/", lambda req: __import__("django.http").http.JsonResponse({"ok": True})),
    path("api/auth/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/auth/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/auth/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("metrics/", ExportToDjangoView, name="prometheus-metrics"),
]
