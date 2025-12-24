from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, AttributeSetViewSet, AttributeViewSet, DepartmentViewSet, DesignationViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)
router.register(r'attribute-sets', AttributeSetViewSet)
router.register(r'attributes', AttributeViewSet)
  # /api/hrms/employees/list/
router.register(r'departments', DepartmentViewSet)
router.register(r'designations', DesignationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
