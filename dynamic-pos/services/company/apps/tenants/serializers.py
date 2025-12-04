from rest_framework import serializers
from .models import (
    Company, NavigationItem, CompanySetting, Wing,
    Currency, InvoiceSettings, Employee
)


class NavigationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NavigationItem
        fields = "__all__"
        read_only_fields = ("id", "company")


class CompanySettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySetting
        fields = "__all__"
        read_only_fields = ("company",)


class WingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wing
        fields = "__all__"
        read_only_fields = ("id", "company")


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = "__all__"


class InvoiceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceSettings
        fields = "__all__"
        read_only_fields = ("company", "sequence_name", "next_invoice_number")


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = "__all__"
        read_only_fields = ("id", "company", "date_joined")
