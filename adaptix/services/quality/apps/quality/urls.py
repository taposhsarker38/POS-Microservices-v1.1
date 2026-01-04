from rest_framework.routers import DefaultRouter
from .views import (
    QualityStandardViewSet, InspectionViewSet, TestResultViewSet,
    DefectCategoryViewSet, InspectionPhotoViewSet
)

router = DefaultRouter()
router.register(r'standards', QualityStandardViewSet)
router.register(r'inspections', InspectionViewSet)
router.register(r'results', TestResultViewSet)
router.register(r'defect-categories', DefectCategoryViewSet)
router.register(r'photos', InspectionPhotoViewSet)

urlpatterns = router.urls
