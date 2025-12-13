from django.urls import path
from .views import ReorderPointView

urlpatterns = [
    path('reorder-points/', ReorderPointView.as_view(), name='reorder-points'),
]
