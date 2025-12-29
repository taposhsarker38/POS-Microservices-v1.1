from rest_framework import serializers
from .models import Customer, AttributeSet, Attribute
from django.db import connection

class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute
        fields = '__all__'

class AttributeSetSerializer(serializers.ModelSerializer):
    attributes = AttributeSerializer(many=True, read_only=True)
    
    class Meta:
        model = AttributeSet
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    branch_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'loyalty_points', 'tier', 'company_uuid', 'is_email_verified', 'is_phone_verified', 'email_otp', 'phone_otp')

    def get_branch_name(self, obj):
        if not obj.branch_id:
            return "General"
        
        try:
            with connection.cursor() as cursor:
                # Check Wings (Branches) first
                cursor.execute("SELECT name FROM company.tenants_wing WHERE id = %s", [str(obj.branch_id)])
                row = cursor.fetchone()
                if row:
                    return f"{row[0]}"
                
                # Check Companies (Units/Groups)
                cursor.execute("SELECT name FROM company.tenants_company WHERE id = %s", [str(obj.branch_id)])
                row = cursor.fetchone()
                if row:
                    return f"{row[0]}"
        except Exception:
            return "Unknown"
            
        return "Unknown"
