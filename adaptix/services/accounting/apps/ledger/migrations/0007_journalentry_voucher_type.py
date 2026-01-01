from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('ledger', '0006_wing_uuid_support'),
    ]

    operations = [
        migrations.AddField(
            model_name='journalentry',
            name='voucher_type',
            field=models.CharField(choices=[('receipt', 'Receipt'), ('payment', 'Payment'), ('contra', 'Contra'), ('journal', 'Journal')], db_index=True, default='journal', max_length=20),
        ),
    ]
