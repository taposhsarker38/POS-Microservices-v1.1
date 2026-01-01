from rest_framework import serializers, viewsets
from django.db import transaction
from .models import AccountGroup, ChartOfAccount, JournalEntry, JournalItem, SystemAccount

class AccountGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountGroup
        fields = '__all__'

class ChartOfAccountSerializer(serializers.ModelSerializer):
    group_type = serializers.ReadOnlyField(source='group.group_type')
    
    class Meta:
        model = ChartOfAccount
        fields = '__all__'

class SystemAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemAccount
        fields = '__all__'

class JournalItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalItem
        fields = ('account', 'debit', 'credit', 'description')

class JournalEntrySerializer(serializers.ModelSerializer):
    items = JournalItemSerializer(many=True)

    class Meta:
        model = JournalEntry
        fields = '__all__'

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        entry = JournalEntry.objects.create(**validated_data)
        for item_data in items_data:
            JournalItem.objects.create(entry=entry, **item_data)
        return entry

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # Update Header
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update Items (Sync strategy: Delete and recreate for simplicity)
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                JournalItem.objects.create(entry=instance, **item_data)
        
        return instance

class AccountGroupViewSet(viewsets.ModelViewSet):
    queryset = AccountGroup.objects.all()
    serializer_class = AccountGroupSerializer

    def perform_create(self, serializer):
        user_id = self.request.META.get('HTTP_X_USER_ID')
        serializer.save(created_by=user_id)

    def perform_update(self, serializer):
        user_id = self.request.META.get('HTTP_X_USER_ID')
        serializer.save(updated_by=user_id)

class ChartOfAccountViewSet(viewsets.ModelViewSet):
    queryset = ChartOfAccount.objects.all()
    serializer_class = ChartOfAccountSerializer

    def perform_create(self, serializer):
        user_id = self.request.META.get('HTTP_X_USER_ID')
        serializer.save(created_by=user_id)

    def perform_update(self, serializer):
        user_id = self.request.META.get('HTTP_X_USER_ID')
        serializer.save(updated_by=user_id)

class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer

    def perform_create(self, serializer):
        user_id = self.request.META.get('HTTP_X_USER_ID')
        serializer.save(created_by=user_id)

    def perform_update(self, serializer):
        user_id = self.request.META.get('HTTP_X_USER_ID')
        serializer.save(updated_by=user_id)
