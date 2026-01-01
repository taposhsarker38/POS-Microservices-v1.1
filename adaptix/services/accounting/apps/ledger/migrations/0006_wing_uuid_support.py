from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('ledger', '0005_audit_timestamps'),
    ]

    operations = [
        migrations.AddField(
            model_name='accountgroup',
            name='wing_uuid',
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='chartofaccount',
            name='wing_uuid',
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
    ]
