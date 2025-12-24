from rest_framework import serializers
from .models import (
    Company, NavigationItem, CompanySetting, Wing,
    Currency, InvoiceSettings, Employee,
    Department, Designation, AccountGroup, ChartOfAccount
)


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "code", "timezone", "parent", "is_group", "entity_type"]
        read_only_fields = ["id"]


class WingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wing
        fields = ["id", "name", "code", "metadata", "company"]


class OrganizationTreeSerializer(serializers.ModelSerializer):
    subsidiaries = serializers.SerializerMethodField()
    wings = WingSerializer(many=True, read_only=True)
    type = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ["id", "name", "code", "is_group", "type", "subsidiaries", "wings"]

    def get_subsidiaries(self, obj):
        subs = obj.subsidiaries.all()
        if subs:
            return OrganizationTreeSerializer(subs, many=True).data
        return []

    def get_type(self, obj):
        if obj.is_group:
            return "GROUP" if not obj.parent else "HOLDING"
        return "UNIT"


class NavigationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NavigationItem
        fields = "__all__"
        read_only_fields = ("id", "company")


class CompanySettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySetting
        fields = [
            'id',
            'primary_color',
            'secondary_color',
            'accent_color',
            'background_color',
            'text_color',
            'logo',
            'favicon',
            'feature_flags',
            'ui_schema',
        ]
        read_only_fields = ('id', 'company', 'feature_flags')


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
    department_name = serializers.ReadOnlyField(source='department.name')
    designation_name = serializers.ReadOnlyField(source='designation.name')

    class Meta:
        model = Employee
        fields = "__all__"
        read_only_fields = ("id", "company", "date_joined")


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = "__all__"
        read_only_fields = ("company",)

class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = "__all__"
        read_only_fields = ("company",)

class AccountGroupSerializer(serializers.ModelSerializer):
    subgroups = serializers.SerializerMethodField()
    class Meta:
        model = AccountGroup
        fields = "__all__"
        read_only_fields = ("company",)
    
    def get_subgroups(self, obj):
        # simple recursion limiter could be added if needed
        return AccountGroupSerializer(obj.subgroups.all(), many=True).data

class ChartOfAccountSerializer(serializers.ModelSerializer):
    group_name = serializers.ReadOnlyField(source='group.name')
    class Meta:
        model = ChartOfAccount
        fields = "__all__"
        read_only_fields = ("company", "current_balance")

