from rest_framework import permissions

class HasPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # 1. Allow if no permission required or superuser
        required_perm = getattr(view, "required_permission", None)
        if not required_perm:
            return True
        
        claims = getattr(request, "user_claims", {}) or {}
        roles = claims.get("roles", [])
        if "superuser" in roles:
            return True
            
        user_perms = claims.get("permissions", [])
        return required_perm in user_perms
