from rest_framework import serializers, viewsets
from django.db import transaction
from decimal import Decimal
from .models import AccountGroup, ChartOfAccount, JournalEntry, JournalItem, SystemAccount, AccountingPeriod

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

    def validate(self, data):
        # 1. Period Check
        company_uuid = data.get('company_uuid') or (self.instance.company_uuid if self.instance else None)
        entry_date = data.get('date') or (self.instance.date if self.instance else None)

        if company_uuid and entry_date:
            is_closed = AccountingPeriod.objects.filter(
                company_uuid=company_uuid,
                start_date__lte=entry_date,
                end_date__gte=entry_date,
                is_closed=True
            ).exists()
            if is_closed:
                raise serializers.ValidationError("Cannot post transaction to a closed accounting period.")

        return data

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Explicitly handle empty string for wing_uuid if it comes through
        if 'wing_uuid' in validated_data and validated_data['wing_uuid'] == "":
            validated_data['wing_uuid'] = None

        entry = JournalEntry.objects.create(**validated_data)
        
        total_debit = Decimal('0')
        total_credit = Decimal('0')
        
        for item_data in items_data:
            JournalItem.objects.create(entry=entry, **item_data)
            total_debit += Decimal(str(item_data.get('debit', 0)))
            total_credit += Decimal(str(item_data.get('credit', 0)))
            
        entry.total_debit = total_debit
        entry.total_credit = total_credit
        entry.save(update_fields=['total_debit', 'total_credit'])
            
        return entry

    @transaction.atomic
    def update(self, instance, validated_data):
        # Rule: Only manual entries can be edited
        if instance.source != 'manual':
            raise serializers.ValidationError(f"Cannot edit automated {instance.source} entries directly.")

        # Rule: Only manual entries can be edited
        if instance.source != 'manual':
            raise serializers.ValidationError(f"Cannot edit automated {instance.source} entries directly.")

        items_data = validated_data.pop('items', None)
        
        # Explicitly handle empty string for wing_uuid
        if 'wing_uuid' in validated_data and validated_data['wing_uuid'] == "":
            validated_data['wing_uuid'] = None
        
        # Update Header
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update Items (Sync strategy: Delete and recreate for simplicity)
        if items_data is not None:
            instance.items.all().delete()
            
            total_debit = Decimal('0')
            total_credit = Decimal('0')
            
            for item_data in items_data:
                JournalItem.objects.create(entry=instance, **item_data)
                total_debit += Decimal(str(item_data.get('debit', 0)))
                total_credit += Decimal(str(item_data.get('credit', 0)))
            
            instance.total_debit = total_debit
            instance.total_credit = total_credit
            
        instance.save()
        
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
        # On create, we can also default the source to manual if not provided
        # But create doesn't have the same strict admin check unless required by user.
        # The user said: "১. শুধুমাত্র অ্যাডমিন এডিট করতে পারবে।" -> creation isn't mentioned, usually staff can post journals.
        serializer.save(created_by=user_id)

    def perform_update(self, serializer):
        user_id = self.request.META.get('HTTP_X_USER_ID')
        serializer.save(updated_by=user_id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.source != 'manual':
            return Response({"detail": f"Cannot delete automated {instance.source} entries."}, status=status.HTTP_403_FORBIDDEN)
            
        return super().destroy(request, *args, **kwargs)
