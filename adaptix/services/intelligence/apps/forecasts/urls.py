from django.urls import path
from .views import SalesForecastView

urlpatterns = [
    path('sales/', SalesForecastView.as_view(), name='sales-forecast'),
]
