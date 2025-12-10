from django.contrib import admin
from .models import Payroll

@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ('employee', 'month', 'net_salary', 'status', 'payment_date')
    list_filter = ('month', 'status')
