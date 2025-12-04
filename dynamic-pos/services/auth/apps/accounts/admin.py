from django.contrib import admin
from .models import User, Role, Permission, Menu, Company
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "is_staff", "is_active","email_verified")
    list_filter = ("is_staff", "is_active", "email_verified")
    search_fields = ("username", "email", "first_name", "last_name")
    list_editable = ("is_active", "is_staff", "email_verified")
    ordering = ("username",)

admin.site.register(Role)
admin.site.register(Permission)
admin.site.register(Menu)
admin.site.register(Company)
