from rest_framework.routers import DefaultRouter
from .views import QualityStandardViewSet, InspectionViewSet

router = DefaultRouter()
router.register(r'standards', QualityStandardViewSet)
router.register(r'inspections', InspectionViewSet)

urlpatterns = router.urls
