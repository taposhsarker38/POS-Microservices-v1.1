from django.urls import path
from .views import FinancialAnomalyView

urlpatterns = [
    path('', FinancialAnomalyView.as_view(), name='financial-anomalies'),
]
