from django.urls import path
from .views import SalesTrendView

urlpatterns = [
    path('', SalesTrendView.as_view(), name='sales-trends'),
]
