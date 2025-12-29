from rest_framework import serializers
from .models import User, Role, Permission, Menu, Company
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id","codename","name"]

class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(queryset=Permission.objects.all(), many=True, write_only=True, required=False)

    class Meta:
        model = Role
        fields = ["id", "name", "company", "permissions", "permission_ids"]
    def create(self, validated_data):
        p_ids = validated_data.pop("permission_ids", [])
        role = Role.objects.create(**validated_data)
        if p_ids:
            role.permissions.set(p_ids)
        return role

    def update(self, instance, validated_data):
        p_ids = validated_data.pop("permission_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if p_ids is not None:
            instance.permissions.set(p_ids)
        return instance

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "uuid", "name", "code", "timezone"]

class UserSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(queryset=Company.objects.all(), source="company", write_only=True, required=False)
    roles = RoleSerializer(many=True, read_only=True)
    role_ids = serializers.PrimaryKeyRelatedField(queryset=Role.objects.all(), many=True, write_only=True, required=False)
    
    # Direct permissions
    direct_permissions = PermissionSerializer(many=True, read_only=True)
    direct_permission_ids = serializers.PrimaryKeyRelatedField(queryset=Permission.objects.all(), many=True, write_only=True, required=False)
    
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    is_terminal = serializers.BooleanField(default=False)
    
    company_uuid = serializers.UUIDField(source='company.uuid', read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "is_active", "email_verified", "company", "company_id", "company_uuid", "branch_uuid", "is_terminal", "roles", "role_ids", "direct_permissions", "direct_permission_ids", "password","confirm_password"]
        read_only_fields = ["id", "roles", "direct_permissions", "company", "company_uuid"]

    def validate(self, attrs):
        pwd = attrs.get("password")
        cpwd = attrs.get("confirm_password")
        # If either provided, require both and validate
        if pwd or cpwd:
            if not pwd or not cpwd:
                raise serializers.ValidationError({"password": "Both password and confirm_password are required."})
            if pwd != cpwd:
                raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
            # Use Django's password validators (length, common, numeric, etc)
            try:
                validate_password(pwd, user=self.instance if getattr(self, "instance", None) else None)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"password": list(e.messages)})
        return attrs
    def validate_email(self, value):
        qs = User.objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Email already taken.")
        return value
    def create(self, validated_data):
        roles = validated_data.pop("role_ids", [])
        direct_perms = validated_data.pop("direct_permission_ids", [])
        password = validated_data.pop("password", None)
        # remove confirm_password if present
        validated_data.pop("confirm_password", None)
        
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        if roles:
            user.roles.set(roles)
        if direct_perms:
            user.direct_permissions.set(direct_perms)
        return user

    def update(self, instance, validated_data):
        roles = validated_data.pop("role_ids", None)
        direct_perms = validated_data.pop("direct_permission_ids", None)
        password = validated_data.pop("password", None)
        validated_data.pop("confirm_password", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        if roles is not None:
            instance.roles.set(roles)
        if direct_perms is not None:
            instance.direct_permissions.set(direct_perms)
        return instance

class MenuSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    permission = PermissionSerializer(read_only=True)
    permission_id = serializers.PrimaryKeyRelatedField(queryset=Permission.objects.all(), source="permission", write_only=True, required=False)

    class Meta:
        model = Menu
        fields = ["id", "title", "path", "parent", "children", "permission", "permission_id", "order", "icon"]

    def get_children(self, obj):
        qs = obj.children.all().order_by("order")
        return MenuSerializer(qs, many=True).data

