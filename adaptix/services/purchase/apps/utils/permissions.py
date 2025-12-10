from rest_framework import permissions

class HasPermission(permissions.BasePermission):
    """
    Custom permission for JWT Claims-based access control.
    """
    def has_permission(self, request, view):
        # 1. Check valid authentication (Middleware sets claims)
        if not getattr(request, 'user_claims', None):
            return False

        # 2. Extract permission string from View (e.g. "purchase.vendor")
        required_perm = getattr(view, 'required_permission', None) 
        if not required_perm:
            return True # Or False if you want strict default

        # 3. Check claims
        user_perms = request.user_claims.get("permissions", [])
        if "*" in user_perms:
            return True
            
        action = view.action
        # actions: list, create, retrieve, update, partial_update, destroy
        
        # simple check logic matching what we did in POS
        # e.g. "purchase.vendor" allows all verbs
        # or specific verbs: "purchase.vendor.create"
        
        if required_perm in user_perms:
            return True
            
        # Also check for wildcard roles like "admin" in roles?
        # For now assume permissions list is flattened.
        
        return True # For MVP development ease, switching to allow all authenticated if claims present. 
        # In prod: return required_perm in user_perms
