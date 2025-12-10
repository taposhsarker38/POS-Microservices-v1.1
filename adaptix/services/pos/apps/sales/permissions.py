from rest_framework import permissions

class HasPermission(permissions.BasePermission):
    """
    Checks if the user has the required permission via JWT claims.
    """
    def has_permission(self, request, view):
        # 1. Allow if no permission required
        required_perm = getattr(view, "required_permission", None)
        if not required_perm:
            return True

        # 2. Get permissions from request.user_claims (set by middleware)
        claims = getattr(request, "user_claims", {}) or {}
        user_perms = claims.get("permissions", [])
        roles = claims.get("roles", [])

        if "superuser" in roles:
            return True

        # 3. Check if user has the permission
        if required_perm in user_perms:
            return True
        
        return False
