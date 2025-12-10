from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccountGroupViewSet, ChartOfAccountViewSet, JournalEntryViewSet

router = DefaultRouter()
router.register(r'groups', AccountGroupViewSet)
router.register(r'accounts', ChartOfAccountViewSet)
router.register(r'journals', JournalEntryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
