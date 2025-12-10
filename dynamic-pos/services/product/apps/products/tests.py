from django.test import TestCase
from .models import Category, Brand, Product, Unit

class ProductModelTest(TestCase):
    def setUp(self):
        self.company_uuid = "123e4567-e89b-12d3-a456-426614174000"
        self.category = Category.objects.create(name="Test Category", company_uuid=self.company_uuid)
        self.brand = Brand.objects.create(name="Test Brand", company_uuid=self.company_uuid)
        self.unit = Unit.objects.create(name="Piece", short_name="pc", company_uuid=self.company_uuid)

    def test_create_product(self):
        product = Product.objects.create(
            name="Test Product",
            category=self.category,
            brand=self.brand,
            unit=self.unit,
            company_uuid=self.company_uuid
        )
        self.assertEqual(product.name, "Test Product")
        self.assertEqual(product.category.name, "Test Category")
