from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('procurement', '0004_purchaseorder_paid_amount_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='purchaseorder',
            name='branch_id',
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
    ]
