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


def test_theme_derives_readable_ink_and_soft_background():
    """Atrapa un color de acción con texto ilegible (contraste < 4.5) o una fuente fuera de la lista curada."""
    from registry_app.utils.brand import theme
    dark = theme("#7A2E2A", "Fraunces", 24)
    light = theme("#F6E4C4", "Comic Sans", 99)
    assert dark["colorTexto"] == "#FFFFFF" and dark["contraste"] >= 4.5
    assert (light["colorTexto"], light["fuente"], light["radio"]) == ("#1A1815", "Instrument Serif", 14)
    assert dark["colorSuave"] == "#F2EAEA"
