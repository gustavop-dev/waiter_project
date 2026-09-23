import hashlib
import re

import experience_app.models.diner
from django.db import migrations, models


def preserve_benefits(apps, schema_editor):
    Diner = apps.get_model('experience_app', 'Diner')
    Claim = apps.get_model('experience_app', 'SignupDiscountClaim')
    Line = apps.get_model('experience_app', 'CartLine')
    # Un valor por dispositivo existente; AddField(default=callable) puede compartir un único valor al migrar.
    for diner in Diner.objects.select_related('account').iterator():
        diner.benefit_key = diner.key
        diner.save(update_fields=['benefit_key'])
        account = diner.account
        if not account or not (account.discount_used_at or account.discount_order_id):
            continue
        order_id = account.discount_order_id or Line.objects.filter(diner_id=diner.id, discount__gt=0, order__isnull=False).values_list('order_id', flat=True).first()
        if not order_id:
            continue
        identities = ['cookie:' + diner.benefit_key]
        phone = re.sub(r'[^0-9]', '', account.phone)
        if len(phone) == 10 and phone.startswith('3'):
            phone = '57' + phone
        if phone:
            identities.append('phone:' + phone)
        for value in identities:
            Claim.objects.get_or_create(key=hashlib.sha256(value.encode()).hexdigest(), defaults={'order_id': order_id})


class Migration(migrations.Migration):
    dependencies = [('experience_app', '0006_signupdiscountclaim')]
    operations = [
        migrations.AddField(model_name='diner', name='benefit_key', field=models.CharField(max_length=64, null=True)),
        migrations.RunPython(preserve_benefits, migrations.RunPython.noop),
        migrations.AlterField(model_name='diner', name='benefit_key', field=models.CharField(default=experience_app.models.diner.new_key, max_length=64)),
    ]
