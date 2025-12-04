from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from apps.accounts import urls as accounts_urls
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include(accounts_urls)),
    path("health/", lambda req: __import__("django.http").http.JsonResponse({"ok": True})),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
]
