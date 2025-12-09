
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth import authenticate, get_user_model
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from .jwks import load_jwk_from_pem
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.backends import TokenBackend
from .utils import api_response
from rest_framework import status as http_status
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.db import connection
from .models import User, Role, Permission, Menu, Company
from .serializers import UserSerializer, RoleSerializer, PermissionSerializer, MenuSerializer
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from apps.accounts.utils import send_verification_email
import logging

logger = logging.getLogger(__name__)
# --- Audit helper (graceful if AuditLog model missing) ---
def log_audit(user, action, meta=None):
    try:
        from .models import AuditLog
        AuditLog.objects.create(user=user, action=action, meta=meta or {})
    except Exception:
        # If AuditLog not present or fails, just log to app logs
        logger.debug("AuditLog unavailable or failed. user=%s action=%s meta=%s", getattr(user, "id", None), action, meta)


@api_view(["POST"])
@permission_classes([AllowAny])
def resend_verification_view(request):
    email = request.data.get("email")
    if not email:
        return api_response(message="Email required", success=False, status_code=400)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return api_response(message="If that email exists, verification sent.", success=True, status_code=200)

    if user.email_verified:
        return api_response(message="Email already verified", success=True, status_code=200)

    send_verification_email(user, request)

    return api_response(message="Verification email resent", success=True, status_code=200)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().select_related("company").prefetch_related("roles")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        try:
            qs = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(qs)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return api_response(data=serializer.data, message="User list", success=True, status_code=status.HTTP_200_OK)
            serializer = self.get_serializer(qs, many=True)
            return api_response(data=serializer.data, message="User list", success=True, status_code=status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return api_response(data=serializer.data, message="User retrieved", success=True, status_code=status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=status.HTTP_404_NOT_FOUND)

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                return api_response(
                    message="Validation error",
                    success=False,
                    status_code=status.HTTP_400_BAD_REQUEST,
                    errors=serializer.errors
                )

            self.perform_create(serializer)
            user = serializer.instance

            user.is_active = getattr(settings, "ACTIVATE_USER_IMMEDIATELY", False)
            user.email_verified = False
            user.save()

            # send verification email
            try:
                send_verification_email(user, request)
            except Exception:
                logger.exception("send_verification_email failed")

            log_audit(
                request.user if request.user.is_authenticated else None,
                "user_created",
                {"user_id": str(user.id), "username": user.username}
            )

            data = self.get_serializer(user).data
            return api_response(
                data=data,
                message="User created (verification email sent)",
                success=True,
                status_code=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return api_response(
                message=str(e),
                success=False,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


    def update(self, request, *args, **kwargs):
        try:
            partial = False
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            if not serializer.is_valid():
                return api_response(message="Validation error", success=False, status_code=status.HTTP_400_BAD_REQUEST, errors=serializer.errors)
            self.perform_update(serializer)
            log_audit(request.user, "user_updated", {"user_id": str(instance.id)})
            return api_response(data=serializer.data, message="User updated", success=True, status_code=status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, *args, **kwargs):
        try:
            partial = True
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            if not serializer.is_valid():
                return api_response(message="Validation error", success=False, status_code=status.HTTP_400_BAD_REQUEST, errors=serializer.errors)
            self.perform_update(serializer)
            log_audit(request.user, "user_partial_updated", {"user_id": str(instance.id)})
            return api_response(data=serializer.data, message="User partially updated", success=True, status_code=status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            log_audit(request.user, "user_deleted", {"user_id": str(instance.id)})
            return api_response(data={}, message="User deleted", success=True, status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all().prefetch_related("permissions")
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        try:
            qs = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(qs)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return api_response(data=serializer.data, message="Role list", success=True, status_code=http_status.HTTP_200_OK)
            serializer = self.get_serializer(qs, many=True)
            return api_response(data=serializer.data, message="Role list", success=True, status_code=http_status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return api_response(data=serializer.data, message="Role retrieved", success=True, status_code=http_status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_404_NOT_FOUND)

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                return api_response(message="Validation error", success=False, status_code=http_status.HTTP_400_BAD_REQUEST, errors=serializer.errors)
            self.perform_create(serializer)
            return api_response(data=serializer.data, message="Role created", success=True, status_code=http_status.HTTP_201_CREATED)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=False)
            if not serializer.is_valid():
                return api_response(message="Validation error", success=False, status_code=http_status.HTTP_400_BAD_REQUEST, errors=serializer.errors)
            self.perform_update(serializer)
            return api_response(data=serializer.data, message="Role updated", success=True, status_code=http_status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            if not serializer.is_valid():
                return api_response(message="Validation error", success=False, status_code=http_status.HTTP_400_BAD_REQUEST, errors=serializer.errors)
            self.perform_update(serializer)
            return api_response(data=serializer.data, message="Role partially updated", success=True, status_code=http_status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return api_response(data={}, message="Role deleted", success=True, status_code=http_status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)


class PermissionViewSet(viewsets.ModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        try:
            qs = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(qs)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return api_response(data=serializer.data, message="Permission list", success=True, status_code=http_status.HTTP_200_OK)
            serializer = self.get_serializer(qs, many=True)
            return api_response(data=serializer.data, message="Permission list", success=True, status_code=http_status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return api_response(data=serializer.data, message="Permission retrieved", success=True, status_code=http_status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_404_NOT_FOUND)

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                return api_response(message="Validation error", success=False, status_code=http_status.HTTP_400_BAD_REQUEST, errors=serializer.errors)
            self.perform_create(serializer)
            return api_response(data=serializer.data, message="Permission created", success=True, status_code=http_status.HTTP_201_CREATED)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=False)
            if not serializer.is_valid():
                return api_response(message="Validation error", success=False, status_code=http_status.HTTP_400_BAD_REQUEST, errors=serializer.errors)
            self.perform_update(serializer)
            return api_response(data=serializer.data, message="Permission updated", success=True, status_code=http_status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            if not serializer.is_valid():
                return api_response(message="Validation error", success=False, status_code=http_status.HTTP_400_BAD_REQUEST, errors=serializer.errors)
            self.perform_update(serializer)
            return api_response(data=serializer.data, message="Permission partially updated", success=True, status_code=http_status.HTTP_200_OK)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return api_response(data={}, message="Permission deleted", success=True, status_code=http_status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return api_response(message=str(e), success=False, status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR)


class MenuView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Menu.objects.filter(parent__isnull=True).order_by("order")
        data = MenuSerializer(qs, many=True).data
        return api_response(data=data, message="Menu list", success=True, status_code=http_status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    try:
        username = request.data.get("username")
        password = request.data.get("password")

        # Missing fields
        missing = {}
        if not username:
            missing["username"] = "This field is required."
        if not password:
            missing["password"] = "This field is required."
        if missing:
            return api_response(
                message="Validation error",
                success=False,
                status_code=http_status.HTTP_400_BAD_REQUEST,
                errors={"fields": missing},
            )

        # 🔥 STEP 1: Try to get user WITHOUT authenticate()
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user_obj = User.objects.get(username=username)
        except User.DoesNotExist:
            user_obj = None

        # 🔥 STEP 2: If user exists but email not verified → return 403 BEFORE authenticate()
        if user_obj and not user_obj.email_verified:
            return api_response(
                message="Email not verified",
                success=False,
                status_code=http_status.HTTP_403_FORBIDDEN,
                errors={"email_verified": "Please verify your email before logging in."},
                data={
                    "resend_verification_endpoint": "/api/auth/resend-verification/"
                }
            )

        # 🔥 STEP 3: If user exists but inactive → show proper message
        if user_obj and not user_obj.is_active:
            return api_response(
                message="Account disabled",
                success=False,
                status_code=http_status.HTTP_403_FORBIDDEN,
                errors={"account": "User is inactive. Contact support."}
            )

        # 🔥 STEP 4: NOW authenticate
        user = authenticate(request, username=username, password=password)

        if not user:
            return api_response(
                message="Invalid credentials",
                success=False,
                status_code=http_status.HTTP_401_UNAUTHORIZED,
            )

        # Fetch roles and permissions
        roles_qs = user.roles.prefetch_related("permissions").all()
        roles_list = [r.name for r in roles_qs]
        permissions_list = list(set([p.codename for r in roles_qs for p in r.permissions.all()]))

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        access["iss"] = "prod-client-kid"
        # Add company_uuid to the token payload
        access["company_uuid"] = str(user.company.uuid) if user.company else None
        # Add RBAC to token
        access["roles"] = roles_list
        access["permissions"] = permissions_list

        payload = {
            "access": str(access),
            "refresh": str(refresh),
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "company_uuid": str(user.company.uuid) if user.company else None,
                "roles": roles_list,
                "permissions": permissions_list,
            },
            "algorithm": "RS256"
        }

        return api_response(
            data=payload,
            message="Logged in",
            success=True,
            status_code=http_status.HTTP_200_OK,
        )

    except Exception as ex:
        return api_response(
            message="Internal server error",
            success=False,
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            errors={"exception": str(ex)}
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verify_view(request):
    user = request.user
    # roles and permissions
    roles_qs = user.roles.prefetch_related("permissions").all()
    roles = [r.name for r in roles_qs]
    permissions = [p.codename for r in roles_qs for p in r.permissions.all()]

    payload = {
        "active": True,
        "user": {"id": str(user.id), "username": user.username, "email": user.email},
        "roles": roles,
        "permissions": permissions,
    }
    return api_response(data=payload, message="Token valid", success=True, status_code=http_status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([AllowAny])
def jwks_view(request):
    public_key_path = getattr(settings, "PUBLIC_KEY_PATH", "/keys/public.pem")
    jwk = load_jwk_from_pem(public_key_path)
    return JsonResponse({"keys": [jwk]})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        refresh_token = request.data["refresh"]
        token = RefreshToken(refresh_token)
        # requires rest_framework_simplejwt.token_blacklist app installed and migrated
        token.blacklist()
        return api_response(message="Logged out", success=True, status_code=http_status.HTTP_200_OK)
    except Exception as e:
        return api_response(message=str(e), success=False, status_code=http_status.HTTP_400_BAD_REQUEST, data={})

@api_view(["GET"])
@permission_classes([AllowAny])
def health_view(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
        db_ok = True
    except Exception:
        db_ok = False

    data = {
        "service": "auth",
        "db_status": "ok" if db_ok else "error",
    }
    return api_response(
        data=data,
        message="health check",
        success=db_ok,
        status_code=http_status.HTTP_200_OK if db_ok else http_status.HTTP_503_SERVICE_UNAVAILABLE,
    )

@api_view(["GET"])
@permission_classes([AllowAny])
def verify_email_view(request):
    token = request.GET.get("token")
    if not token:
        return api_response(message="token required", success=False, status_code=400)

    try:
        user = User.objects.get(verify_email_token=token)
    except User.DoesNotExist:
        return api_response(message="Invalid token", success=False, status_code=400)

    user.email_verified = True
    user.is_active = True
    user.verify_email_token = None
    user.save()
    log_audit(user, "email_verified", {"user_id": str(user.id)})
    return api_response(message="Email verified", success=True, status_code=status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    email = request.data.get("email")
    if not email:
        return api_response(message="email required", success=False, status_code=status.HTTP_400_BAD_REQUEST)
    qs = User.objects.filter(email__iexact=email)
    if qs.exists():
        user = qs.first()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_base = getattr(settings, "FRONTEND_URL", None) or f"{request.scheme}://{request.get_host()}"
        reset_path = "/login/reset"
        reset_url = f"{frontend_base.rstrip('/')}{reset_path}?uid={uid}&token={token}"
        subject = "Password reset"
        message = f"Click the link to reset your password: {reset_url}"
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        log_audit(user, "password_reset_requested", {})
    return api_response(message="If that email exists, reset link sent.", success=True, status_code=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    uid = request.data.get("uid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")
    if not uid or not token or not new_password:
        return api_response(message="missing fields", success=False, status_code=status.HTTP_400_BAD_REQUEST)
    try:
        pk = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=pk)
    except Exception:
        return api_response(message="invalid token/uid", success=False, status_code=status.HTTP_400_BAD_REQUEST)
    if not default_token_generator.check_token(user, token):
        return api_response(message="invalid or expired token", success=False, status_code=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_password)
    user.save()
    log_audit(user, "password_reset_completed", {})
    return api_response(message="password updated", success=True, status_code=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    old = request.data.get("old_password")
    new = request.data.get("new_password")
    if not old or not new:
        return api_response(message="missing fields", success=False, status_code=status.HTTP_400_BAD_REQUEST)
    user = request.user
    if not user.check_password(old):
        return api_response(message="old password mismatch", success=False, status_code=status.HTTP_400_BAD_REQUEST)
    user.set_password(new)
    user.save()
    log_audit(user, "password_changed", {})
    return api_response(message="password changed", success=True, status_code=status.HTTP_200_OK)


# --- Cookie-based token endpoints (optional use) ---
class CookieTokenObtainPairView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(request, username=username, password=password)
        if not user:
            return api_response(message="Invalid credentials", success=False, status_code=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        refresh_token = str(refresh)
        secure_flag = not settings.DEBUG
        cookie_params = {
            "httponly": True,
            "secure": secure_flag,
            "samesite": "Lax",
            "path": "/",
        }
        resp = api_response(data={"access": access}, message="Logged in", success=True, status_code=status.HTTP_200_OK)
        # set cookies on response
        resp.set_cookie("access", access, **cookie_params)
        resp.set_cookie("refresh_token", refresh_token, **cookie_params)
        log_audit(user, "login", {"method": "cookie"})
        return resp

class CookieTokenRefreshView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        refresh = request.COOKIES.get("refresh_token")
        if not refresh:
            return api_response(message="Refresh token not provided", success=False, status_code=status.HTTP_401_UNAUTHORIZED)
        try:
            token = RefreshToken(refresh)
            new_access = str(token.access_token)
        except Exception:
            return api_response(message="Invalid refresh token", success=False, status_code=status.HTTP_401_UNAUTHORIZED)
        secure_flag = not settings.DEBUG
        cookie_params = {"httponly": True, "secure": secure_flag, "samesite": "Lax", "path": "/"}
        resp = api_response(data={"access": new_access}, message="Token refreshed", success=True, status_code=status.HTTP_200_OK)
        resp.set_cookie("access", new_access, **cookie_params)
        return resp

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cookie_logout_view(request):
    refresh = request.COOKIES.get("refresh_token")
    if refresh:
        try:
            rt = RefreshToken(refresh)
            rt.blacklist()
        except Exception:
            pass
    resp = api_response(message="Logged out", success=True, status_code=status.HTTP_200_OK)
    # delete cookies
    resp.delete_cookie("refresh_token", path="/")
    resp.delete_cookie("access", path="/")
    log_audit(request.user, "logout", {})
    return resp