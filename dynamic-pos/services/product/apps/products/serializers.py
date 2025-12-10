from rest_framework import serializers
from .models import Category, Brand, Unit, Product, ProductVariant, Attribute, AttributeSet

class AttributeSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttributeSet
        fields = '__all__'
        read_only_fields = ('company_uuid',)

class AttributeSerializer(serializers.ModelSerializer):
    attribute_set_name = serializers.ReadOnlyField(source='attribute_set.name')
    class Meta:
        model = Attribute
        fields = '__all__'
        read_only_fields = ('company_uuid',)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ('company_uuid',)

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'
        read_only_fields = ('company_uuid',)

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'
        read_only_fields = ('company_uuid',)

class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = '__all__'
        read_only_fields = ('company_uuid', 'sku') # SKU is auto-generated

class ProductSerializer(serializers.ModelSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')
    brand_name = serializers.ReadOnlyField(source='brand.name')
    unit_name = serializers.ReadOnlyField(source='unit.short_name')
    attribute_set_name = serializers.ReadOnlyField(source='attribute_set.name')

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('company_uuid', 'approval_status')

from .models import ApprovalRequest

class ApprovalRequestSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = ApprovalRequest
        fields = '__all__'
        read_only_fields = ('company_uuid', 'requested_by', 'approved_by', 'status')
