from rest_framework.permissions import BasePermission

class HasRole(BasePermission):
    roles = ()
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.role in self.roles)

class IsStaffRole(HasRole):
    roles = ("teacher", "counsellor")

class IsParent(HasRole):
    roles = ("parent",)

class IsStudent(HasRole):
    roles = ("student",)
