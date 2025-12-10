from django.contrib import admin
from .models import AccountGroup, ChartOfAccount, JournalEntry, JournalItem

@admin.register(AccountGroup)
class AccountGroupAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'group_type', 'company_uuid')

@admin.register(ChartOfAccount)
class ChartOfAccountAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'group', 'current_balance')
    
class JournalItemInline(admin.TabularInline):
    model = JournalItem
    extra = 2

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ('date', 'reference', 'total_debit', 'total_credit', 'company_uuid')
    inlines = [JournalItemInline]
