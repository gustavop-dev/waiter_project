import pytest
from django.test import override_settings
from django.urls import reverse

KEY = {"HTTP_X_INTERNAL_KEY": "k"}


@pytest.mark.django_db
@override_settings(REGISTRY_INTERNAL_KEY="k")
def test_resolve_table_returns_tenant_table_and_decrypted_credentials(api_client, table):
    """Atrapa una resolución que no acote por sede o que devuelva la contraseña cifrada."""
    url = reverse("resolve-table", args=["burger-house", "poblado", "8H2KQ7"])
    body = api_client.get(url, **KEY).json()
    assert body["table"] == {"token": "8H2KQ7", "number": 8, "odoo_table_id": 9}
    assert body["odoo"]["password"] == "s3cret"
    assert body["venue"]["slug"] == "poblado"


@pytest.mark.django_db
@override_settings(REGISTRY_INTERNAL_KEY="k")
def test_resolve_venue_without_token_is_the_delivery_entry(api_client, venue):
    """Atrapa que la entrada de domicilio exija mesa."""
    body = api_client.get(reverse("resolve-venue", args=["burger-house", "poblado"]), **KEY).json()
    assert body["table"] is None


@pytest.mark.django_db
@override_settings(REGISTRY_INTERNAL_KEY="k")
def test_resolve_rejects_missing_key_and_unknown_or_revoked_table(api_client, table):
    """Atrapa un registro abierto sin clave o que sirva una placa revocada."""
    url = reverse("resolve-table", args=["burger-house", "poblado", "8H2KQ7"])
    assert api_client.get(url).status_code == 401
    table.active = False
    table.save()
    assert api_client.get(url, **KEY).status_code == 404
    assert api_client.get(reverse("resolve-venue", args=["burger-house", "centro"]), **KEY).status_code == 404


@pytest.mark.django_db
@override_settings(REGISTRY_INTERNAL_KEY="k")
def test_every_credential_release_is_recorded_without_the_credential(api_client, table):
    """Atrapa que el registro entregue credenciales sin dejar rastro, o que el rastro guarde la contraseña.

    Tras un incidente, el rastro dice qué inquilinos quedaron expuestos; sin él habría que rotar todos."""
    from registry_app.models import CredentialRelease

    api_client.get(reverse("resolve-table", args=["burger-house", "poblado", "8H2KQ7"]), **KEY)
    api_client.get(reverse("resolve-venue", args=["burger-house", "poblado"]), **KEY)
    releases = list(CredentialRelease.objects.order_by("released_at").values("restaurant_slug", "venue_slug", "with_table"))
    assert releases == [{"restaurant_slug": "burger-house", "venue_slug": "poblado", "with_table": True},
                        {"restaurant_slug": "burger-house", "venue_slug": "poblado", "with_table": False}]
    assert all("s3cret" not in str(v) for row in CredentialRelease.objects.values() for v in row.values())


@pytest.mark.django_db
@override_settings(REGISTRY_INTERNAL_KEY="k")
def test_refused_resolutions_leave_no_release(api_client, table):
    """Atrapa un rastro que cuente como entregadas credenciales que no se entregaron."""
    from registry_app.models import CredentialRelease

    api_client.get(reverse("resolve-venue", args=["burger-house", "poblado"]))  # sin clave
    api_client.get(reverse("resolve-venue", args=["no-existe", "poblado"]), **KEY)
    api_client.get(reverse("resolve-table", args=["burger-house", "poblado", "ZZZZZZ"]), **KEY)
    assert CredentialRelease.objects.count() == 0
