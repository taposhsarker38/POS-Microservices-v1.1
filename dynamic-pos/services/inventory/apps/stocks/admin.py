from django.contrib import admin
from .models import Warehouse, Stock, Batch, StockTransaction, UOMConversion, StockSerial, BillOfMaterial

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'is_active', 'company_uuid')
    search_fields = ('name',)

class BatchInline(admin.TabularInline):
    model = Batch
    extra = 0

class SerialInline(admin.TabularInline):
    model = StockSerial
    extra = 0

@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('product_uuid', 'warehouse', 'quantity', 'avg_cost')
    search_fields = ('product_uuid', 'warehouse__name')
    list_filter = ('warehouse',)
    inlines = [BatchInline, SerialInline]

@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ('reference_no', 'type', 'stock', 'quantity_change', 'created_by', 'created_at')
    list_filter = ('type', 'created_at')
    search_fields = ('reference_no', 'notes')

@admin.register(UOMConversion)
class UOMConversionAdmin(admin.ModelAdmin):
    list_display = ('product_uuid', 'from_unit', 'to_unit', 'factor')
    search_fields = ('product_uuid', 'from_unit')

@admin.register(StockSerial)
class StockSerialAdmin(admin.ModelAdmin):
    list_display = ('serial_number', 'stock', 'status', 'chassis_number')
    list_filter = ('status',)
    search_fields = ('serial_number', 'chassis_number', 'engine_number')

@admin.register(BillOfMaterial)
class BillOfMaterialAdmin(admin.ModelAdmin):
    list_display = ('parent_product_uuid', 'child_product_uuid', 'quantity')
    search_fields = ('parent_product_uuid', 'child_product_uuid')
