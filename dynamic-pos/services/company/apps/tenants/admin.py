from django.contrib import admin
from .models import (
    Company, Employee, Department, Designation, 
    Wing, Currency, AccountGroup, ChartOfAccount
)

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'created_at')
    search_fields = ('name', 'code')

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'company', 'designation', 'department', 'user_uuid')
    list_filter = ('department', 'designation')

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'company')

@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ('name', 'company')

@admin.register(Wing)
class WingAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'company')

@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'exchange_rate', 'is_base')
