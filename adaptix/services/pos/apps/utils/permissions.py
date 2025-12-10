from rest_framework import permissions

class HasPermission(permissions.BasePermission):
    """
    Custom permission to check if the user has the required scope/permission.
    Usage:
        class MyView(ViewSet):
            permission_classes = [HasPermission]
            required_permission = "view_orders"
    """
    def has_permission(self, request, view):
        required_permission = getattr(view, "required_permission", None)
        if not required_permission:
            return True # No specific permission required

        # Check in user_claims populated by middleware
        user_claims = getattr(request, "user_claims", {})
        user_permissions = user_claims.get("permissions", [])
        
        # Also check simplified scopes if available
        scopes = user_claims.get("scopes", [])
        
        # Merge lists
        all_perms = set(user_permissions + scopes)

        if required_permission in all_perms or "admin" in all_perms:
            return True
            
        return False
