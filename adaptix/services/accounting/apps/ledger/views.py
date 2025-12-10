from rest_framework import viewsets
from .models import AccountGroup, ChartOfAccount, JournalEntry
from .serializers import AccountGroupSerializer, ChartOfAccountSerializer, JournalEntrySerializer

class AccountGroupViewSet(viewsets.ModelViewSet):
    queryset = AccountGroup.objects.all()
    serializer_class = AccountGroupSerializer

class ChartOfAccountViewSet(viewsets.ModelViewSet):
    queryset = ChartOfAccount.objects.all()
    serializer_class = ChartOfAccountSerializer

class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer
