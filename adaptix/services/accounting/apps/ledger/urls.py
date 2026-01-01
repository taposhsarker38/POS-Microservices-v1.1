from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AccountGroupViewSet, ChartOfAccountViewSet, 
    JournalEntryViewSet, SystemAccountViewSet,
    BalanceSheetView, ProfitLossView, 
    TrialBalanceView, AccountingDashboardView
)

router = DefaultRouter()
router.register(r'groups', AccountGroupViewSet)
router.register(r'accounts', ChartOfAccountViewSet)
router.register(r'journals', JournalEntryViewSet)
router.register(r'system-accounts', SystemAccountViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('balance-sheet/', BalanceSheetView.as_view(), name='balance-sheet'),
    path('profit-loss/', ProfitLossView.as_view(), name='profit-loss'),
    path('trial-balance/', TrialBalanceView.as_view(), name='trial-balance'),
    path('dashboard/', AccountingDashboardView.as_view(), name='accounting-dashboard'),
]
