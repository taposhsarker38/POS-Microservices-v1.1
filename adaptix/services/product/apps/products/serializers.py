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
    product_name = serializers.ReadOnlyField(source='product.name')
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
    
    sales_price = serializers.SerializerMethodField()
    alert_quantity = serializers.SerializerMethodField()
    stock_quantity = serializers.SerializerMethodField()
    sku = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ('company_uuid', 'approval_status')

    def get_sales_price(self, obj):
        variant = obj.variants.first()
        return variant.price if variant else 0

    def get_alert_quantity(self, obj):
        variant = obj.variants.first()
        return variant.alert_quantity if variant else 0

    def get_stock_quantity(self, obj):
        from django.db.models import Sum
        return obj.variants.aggregate(total=Sum('quantity'))['total'] or 0

    def get_sku(self, obj):
        variant = obj.variants.first()
        return variant.sku if variant else "NO SKU"

from .models import ApprovalRequest

class ApprovalRequestSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = ApprovalRequest
        fields = '__all__'
        read_only_fields = ('company_uuid', 'requested_by', 'approved_by', 'status')

from .models import PriceList, PriceListItem

class PriceListItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceListItem
        fields = '__all__'

class PriceListSerializer(serializers.ModelSerializer):
    items = PriceListItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = PriceList
        fields = '__all__'
        read_only_fields = ('company_uuid',)
