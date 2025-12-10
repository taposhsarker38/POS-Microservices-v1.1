from django.contrib import admin
from .models import Payment, Transaction

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order_id', 'amount', 'status', 'method', 'updated_at')
    list_filter = ('status', 'method', 'created_at')
    search_fields = ('order_id', 'stripe_charge_id')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('payment', 'status', 'timestamp')
    readonly_fields = ('gateway_response', 'timestamp')
