import pytest

from experience_app.services.sessions import add_line, cart_view, update_line
from experience_app.tests.conftest import ANGUS, LIMONADA
from experience_app.utils.errors import NotOwner


@pytest.mark.django_db
def test_cart_totals_cover_all_three_payment_modes(two_diners):
    """Atrapa un total de mesa o de "lo mío" mal atribuido: pagar lo mío y dividir salen de aquí."""
    session, ana, beto = two_diners
    add_line(session, ana, ANGUS, qty=2)
    add_line(session, beto, LIMONADA, qty=1)
    view = cart_view(session, ana)
    assert view['total'] == 83700.0
    assert view['mio'] == 73800.0
    assert view['por_comensal'] == [{'comensal': str(ana.id), 'total': 73800.0}, {'comensal': str(beto.id), 'total': 9900.0}]
    assert [line['mio'] for line in view['lineas']] == [True, False]


@pytest.mark.django_db
def test_only_the_owner_can_change_a_line(two_diners):
    """Atrapa que un comensal edite o borre lo que pidió otro."""
    session, ana, beto = two_diners
    line = add_line(session, ana, ANGUS, qty=1)
    with pytest.raises(NotOwner):
        update_line(line, beto, qty=5)
    assert update_line(line, ana, qty=3, note='sin cebolla').qty == 3
