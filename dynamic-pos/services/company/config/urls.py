from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from apps.tenants import urls as tenants_urls
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView,SpectacularRedocView
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/company/", include(tenants_urls)),
    path("health/", lambda req: __import__("django.http").http.JsonResponse({"ok": True})),
    path("api/company/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/company/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/company/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
