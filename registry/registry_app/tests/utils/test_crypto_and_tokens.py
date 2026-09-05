import pytest

from registry_app.utils import crypto
from registry_app.utils.tokens import ALPHABET, generate_token


def test_encrypt_round_trips_and_hides_the_plaintext():
    """Atrapa credenciales guardadas en claro o que no se puedan recuperar al resolver."""
    cipher = crypto.encrypt("s3cret")
    assert "s3cret" not in cipher
    assert crypto.decrypt(cipher) == "s3cret"


def test_tokens_never_use_ambiguous_characters():
    """Atrapa placas ilegibles: 0/O y 1/I/L se confunden impresas."""
    sample = "".join(generate_token() for _ in range(300))
    assert set(sample) <= set(ALPHABET)
    assert not set(sample) & set("0O1IL")


@pytest.mark.django_db
def test_venue_password_property_decrypts(venue):
    """Atrapa un cambio en el cifrado que deje inservibles las credenciales guardadas."""
    assert venue.odoo_password == "s3cret"
    assert venue.odoo_secret != "s3cret"
