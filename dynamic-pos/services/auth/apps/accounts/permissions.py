from rest_framework.permissions import BasePermission

class HasPermission(BasePermission):
    def has_permission(self, request, view):
        required = getattr(view, "required_permission", None)
        if required is None:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        # collect permissions from user's roles
        perms = set()
        for r in request.user.role_set.all():
            for p in r.permissions.all():
                perms.add(p.codename)
        return required in perms
