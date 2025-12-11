from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, RoleViewSet, PermissionViewSet, MenuView, CompanyViewSet,
    register_view, login_view, verify_view, jwks_view, logout_view, health_view,
    verify_email_view, password_reset_request_view, password_reset_confirm_view,
    change_password_view, CookieTokenObtainPairView, CookieTokenRefreshView, cookie_logout_view,resend_verification_view
)
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("roles", RoleViewSet, basename="role")
router.register("permissions", PermissionViewSet, basename="permission")
router.register("companies", CompanyViewSet, basename="company")

urlpatterns = router.urls + [
    path("register/", register_view, name="register"),
    path("login/", login_view, name="login"),
    path("menu/", MenuView.as_view(), name="menu"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", logout_view, name="logout"),
    path("verify/", verify_view, name="verify"),         # token verify for gateway
    path(".well-known/jwks.json", jwks_view),            # JWKS endpoint
    path("health/", health_view, name="health"),

    # user/email/password endpoints
    path("resend-verification/", resend_verification_view),
    path("verify-email/", verify_email_view, name="verify-email"),
    path("password/reset/", password_reset_request_view, name="password-reset-request"),
    path("password/reset/confirm/", password_reset_confirm_view, name="password-reset-confirm"),
    path("password/change/", change_password_view, name="password-change"),
    # cookie tokens
    path("token/cookie/login/", CookieTokenObtainPairView.as_view(), name="cookie_login"),
    path("token/cookie/refresh/", CookieTokenRefreshView.as_view(), name="cookie_refresh"),
    path("token/cookie/logout/", cookie_logout_view, name="cookie_logout"),
]
