from django.contrib import admin
from .models import Employee

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'department', 'designation', 'is_active')
    search_fields = ('first_name', 'last_name', 'email')
    list_filter = ('department', 'designation', 'is_active')
