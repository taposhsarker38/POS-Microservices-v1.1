from django.db import migrations, models
import django.utils.timezone

class Migration(migrations.Migration):

    dependencies = [
        ('ledger', '0004_journalentry_wing_uuid'),
    ]

    operations = [
        migrations.AddField(
            model_name='accountgroup',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='chartofaccount',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='journalentry',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
