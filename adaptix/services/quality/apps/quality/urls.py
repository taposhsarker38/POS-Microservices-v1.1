from rest_framework.routers import DefaultRouter
from .views import QualityStandardViewSet, InspectionViewSet, TestResultViewSet

router = DefaultRouter()
router.register(r'standards', QualityStandardViewSet)
router.register(r'inspections', InspectionViewSet)
router.register(r'results', TestResultViewSet)

urlpatterns = router.urls
