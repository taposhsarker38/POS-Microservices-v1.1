from rest_framework import serializers
from .models import SMTPSettings

class SMTPSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMTPSettings
        fields = ['id', 'host', 'port', 'username', 'password', 'use_tls', 'use_ssl', 'default_from_email']
        extra_kwargs = {
            'password': {'write_only': True}  # Don't return password in response
        }
