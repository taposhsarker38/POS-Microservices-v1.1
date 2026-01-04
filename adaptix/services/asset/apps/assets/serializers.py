from .models import AssetCategory, Asset, DepreciationSchedule, AssetTelemetry, AssetMaintenanceTask

class AssetTelemetrySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetTelemetry
        fields = '__all__'

class AssetMaintenanceTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetMaintenanceTask
        fields = '__all__'
        read_only_fields = ['company_uuid', 'id', 'created_at', 'updated_at']

class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = '__all__'

class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    # Add summary fields for health dashboard
    last_telemetry = serializers.SerializerMethodField()
    maintenance_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Asset
        fields = '__all__'
        read_only_fields = ['current_value']

    def get_last_telemetry(self, obj):
        last = obj.telemetry.first()
        if last:
            return AssetTelemetrySerializer(last).data
        return None

    def get_maintenance_status(self, obj):
        pending = obj.maintenance_tasks.filter(status='pending').count()
        return {'pending_tasks': pending}

class DepreciationScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepreciationSchedule
        fields = '__all__'
