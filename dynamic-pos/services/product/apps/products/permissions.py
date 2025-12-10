from rest_framework import permissions

class HasPermission(permissions.BasePermission):
    """
    Checks if the user has the required permission via JWT claims.
    """
    def has_permission(self, request, view):
        required_perm = getattr(view, "required_permission", None)
        if not required_perm:
            return True

        claims = getattr(request, "user_claims", {}) or {}
        user_perms = claims.get("permissions", [])
        roles = claims.get("roles", [])

        if "superuser" in roles:
            return True
        
        # Super admin bypass (roles check) could optionally go here
        
        if required_perm in user_perms:
            return True
        return False
