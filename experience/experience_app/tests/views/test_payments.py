"""Pago simulado: aprueba sin tocar Odoo, deja huella en el log y valida lo mínimo."""
import logging
from unittest.mock import patch

import pytest
from django.urls import reverse

from experience_app.models import Order, TableSession

PAYLOAD = {'restaurante': 'burger-house', 'sede': 'poblado', 'token': '8H2KQ7'}


@pytest.fixture
def session_id(api_client, table_tenant):
    return api_client.post(reverse('open-session'), PAYLOAD, format='json').json()['sesion']['id']


@pytest.mark.django_db
def test_simulated_payment_is_approved_logged_and_never_reaches_odoo(api_client, session_id, caplog):
    """Atrapa un pago demo que cree un pos.payment, cambie la sesión o no deje rastro en el log."""
    Order.objects.create(session_id=session_id, state=Order.SENT, total=97812)
    with patch('experience_app.adapters.odoo.client.OdooClient.call_kw') as call_kw, caplog.at_level(logging.INFO):
        response = api_client.post(reverse('simulated-payment', args=[session_id]), {'metodo': 'Tarjeta', 'monto': 1}, format='json')
    assert response.status_code == 200
    body = response.json()
    assert (body['estado'], body['demo'], body['metodo'], body['monto']) == ('aprobado', True, 'tarjeta', 97812.0)
    assert body['referencia'].startswith('DEMO-') and len(body['referencia']) == 13
    assert call_kw.call_count == 0
    assert TableSession.objects.get(id=session_id).state == TableSession.COMPOSING
    assert any(body['referencia'] in record.getMessage() and 'sin cobro real' in record.getMessage() for record in caplog.records)


@pytest.mark.django_db
def test_simulated_payment_validates_method_amount_and_diner(api_client, session_id):
    """Atrapa un método inventado, un monto negativo o un pago desde otra mesa."""
    url = reverse('simulated-payment', args=[session_id])
    assert api_client.post(url, {'metodo': 'bitcoin', 'monto': 10}, format='json').status_code == 400
    assert api_client.post(url, {'metodo': 'nequi', 'monto': -1}, format='json').status_code == 409
    assert api_client.post(url, {'metodo': 'nequi', 'monto': 'mucho'}, format='json').status_code == 409
    assert api_client.__class__().post(url, {'metodo': 'nequi', 'monto': 10}, format='json').status_code == 404


@pytest.mark.django_db
def test_demo_payment_is_disabled_in_production(api_client, session_id, settings):
    """Falla si la bandera demo permite aparentar pagos en producción."""
    settings.IS_PRODUCTION = True
    settings.DINER_DEMO_ENABLED = True
    Order.objects.create(session_id=session_id, state=Order.SENT, total=100)
    response = api_client.post(reverse('simulated-payment', args=[session_id]), {'metodo': 'pse'}, format='json')
    assert response.status_code == 503


@pytest.mark.django_db
def test_payment_rejects_open_lines_even_with_an_old_confirmed_order(api_client, session_id, catalog_stub):
    """Falla si una segunda ronda se paga usando solo el total de la anterior."""
    Order.objects.create(session_id=session_id, state=Order.SENT, total=100)
    api_client.post(reverse('add-line', args=[session_id]), {'producto_id': 3}, format='json')
    response = api_client.post(reverse('simulated-payment', args=[session_id]), {'metodo': 'pse'}, format='json')
    assert response.status_code == 409


@pytest.mark.django_db
@pytest.mark.parametrize(('scope', 'amount'), [('all', 300), ('mine', 100), ('parts', 150)])
def test_split_amounts_are_calculated_from_server_lines(api_client, session_id, scope, amount):
    """Falla si el reparto usa montos del navegador o líneas de otro comensal como propias."""
    from experience_app.models import CartLine, Diner
    owner = Diner.objects.get(session_id=session_id)
    other = Diner.objects.create(session_id=session_id)
    order = Order.objects.create(session_id=session_id, state=Order.SENT, total=300)
    CartLine.objects.create(session_id=session_id, diner=owner, order=order, status=CartLine.CONFIRMED,
                            product_id=3, name='Uno', unit_price=100)
    CartLine.objects.create(session_id=session_id, diner=other, order=order, status=CartLine.CONFIRMED,
                            product_id=4, name='Otro', unit_price=200)
    response = api_client.post(reverse('simulated-payment', args=[session_id]),
                               {'metodo': 'pse', 'reparto': scope, 'monto': 1}, format='json')
    assert response.status_code == 200
    assert response.json()['monto'] == amount
