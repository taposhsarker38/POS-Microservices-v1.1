from django.urls import path
from .views import RFMView

urlpatterns = [
    path('segmentation/', RFMView.as_view(), name='customer-segmentation'),
]
