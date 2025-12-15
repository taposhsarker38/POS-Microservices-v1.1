from django.urls import path
from .views import AttritionRiskView

urlpatterns = [
    path('attrition-risk/', AttritionRiskView.as_view(), name='attrition-risk'),
]
