import pytest
from django.db import IntegrityError

from registry_app.models import TableToken


@pytest.mark.django_db
def test_same_token_twice_in_one_venue_is_rejected(venue, table):
    """Atrapa la colisión de tokens que Odoo permite: aquí es imposible, no improbable."""
    with pytest.raises(IntegrityError):
        TableToken.objects.create(venue=venue, token="8H2KQ7", odoo_table_id=10, table_number=9)


@pytest.mark.django_db
def test_new_token_is_generated_when_not_given(venue):
    """Atrapa un token vacío o fuera del alfabeto legible al emitir una placa."""
    token = TableToken.objects.create(venue=venue, odoo_table_id=11, table_number=10)
    assert len(token.token) == 6
    assert set(token.token) <= set("ABCDEFGHJKMNPQRSTUVWXYZ23456789")
