from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # your existing API routes
    path("api/company/", include("apps.tenants.urls")),

    # OpenAPI schema (YAML/JSON)
    path("api/company/schema/", SpectacularAPIView.as_view(), name="schema"),  # returns OpenAPI JSON/YAML

    # Swagger UI (interactive)
    path(
        "api/company/docs/swagger/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),

    # Redoc (alternative UI)
    path(
        "api/company/docs/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]
