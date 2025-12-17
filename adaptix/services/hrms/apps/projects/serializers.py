from rest_framework import serializers
from .models import Project, Milestone, Task
from apps.employees.serializers import EmployeeSerializer

class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source='assignee.user.get_full_name', read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True)
    milestone_title = serializers.CharField(source='milestone.title', read_only=True)

    class Meta:
        model = Task
        fields = '__all__'

class MilestoneSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = Milestone
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source='manager.user.get_full_name', read_only=True)
    milestones = MilestoneSerializer(many=True, read_only=True)
    # We might not want to load ALL tasks by default for list view, but for detail it's fine.
    # For now, let's keep it simple.
    
    class Meta:
        model = Project
        fields = '__all__'

class ProjectDetailSerializer(ProjectSerializer):
    """Includes more nested info for the detail view"""
    tasks = TaskSerializer(many=True, read_only=True)
