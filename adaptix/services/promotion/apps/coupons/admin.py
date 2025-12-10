from django.contrib import admin
from .models import Coupon

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'value', 'active', 'times_used', 'valid_to')
    list_filter = ('active', 'discount_type', 'valid_to')
    search_fields = ('code',)
