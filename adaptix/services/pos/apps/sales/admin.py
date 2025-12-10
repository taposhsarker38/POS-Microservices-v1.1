from django.contrib import admin
from .models import Order, OrderItem, Payment, POSSession

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('subtotal',)

class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0

@admin.register(POSSession)
class POSSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_uuid', 'status', 'opening_balance', 'closing_balance', 'start_time', 'company_uuid')
    list_filter = ('status', 'start_time')
    search_fields = ('user_uuid',)

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'customer_name', 'status', 'payment_status', 'grand_total', 'created_at', 'company_uuid')
    list_filter = ('status', 'payment_status', 'module_type', 'created_at')
    search_fields = ('order_number', 'customer_name', 'customer_phone')
    inlines = [OrderItemInline, PaymentInline]
    readonly_fields = ('order_number', 'created_at', 'updated_at', 'company_uuid')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'order', 'method', 'amount', 'created_at')
    list_filter = ('method', 'created_at')
    search_fields = ('transaction_id', 'order__order_number')
