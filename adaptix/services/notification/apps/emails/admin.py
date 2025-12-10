from django.contrib import admin
from .models import EmailTemplate, NotificationLog

@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ('code', 'subject', 'updated_at')
    search_fields = ('code', 'subject')

@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'subject', 'status', 'sent_at')
    list_filter = ('status', 'sent_at')
    search_fields = ('recipient', 'subject')
    readonly_fields = ('content', 'error_message', 'sent_at')
