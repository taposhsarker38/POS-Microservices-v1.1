from django.contrib import admin
from .models import DailySales, TopProduct, Transaction

@admin.register(DailySales)
class DailySalesAdmin(admin.ModelAdmin):
    list_display = ('date', 'total_revenue', 'total_transactions')
    ordering = ('-date',)

@admin.register(TopProduct)
class TopProductAdmin(admin.ModelAdmin):
    list_display = ('product_name', 'total_sold')
    ordering = ('-total_sold',)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'occurred_at')
    list_filter = ('event_type', 'occurred_at')
