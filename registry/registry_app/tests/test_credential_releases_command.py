from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone

from registry_app.models import CredentialRelease


@pytest.mark.django_db
def test_lists_each_tenant_released_since_a_date_once(venue):
    """Atrapa una lista para rotar que repita inquilinos, que incluya entregas anteriores a la fecha o que omita alguno."""
    for slug in ("poblado", "poblado", "laureles"):
        CredentialRelease.objects.create(venue=venue, restaurant_slug="burger-house", venue_slug=slug, with_table=True)
    old = CredentialRelease.objects.create(venue=venue, restaurant_slug="viejo", venue_slug="centro", with_table=False)
    CredentialRelease.objects.filter(pk=old.pk).update(released_at=timezone.now() - timedelta(days=10))
    out = StringIO()
    call_command("credential_releases", since=(timezone.localdate() - timedelta(days=1)).isoformat(), stdout=out)
    text = out.getvalue()
    assert "burger-house/laureles\t1 veces" in text
    assert "burger-house/poblado\t2 veces" in text
    assert "viejo/centro" not in text
    assert "2 inquilinos para rotar." in text


@pytest.mark.django_db
def test_rejects_an_invalid_date():
    """Atrapa que una fecha mal escrita devuelva una lista vacía, que parecería «nada expuesto»."""
    with pytest.raises(CommandError):
        call_command("credential_releases", since="ayer")
