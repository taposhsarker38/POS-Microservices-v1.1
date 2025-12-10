from django.contrib import admin
from .models import Tax

@admin.register(Tax)
class TaxAdmin(admin.ModelAdmin):
    list_display = ('name', 'rate', 'is_active')
