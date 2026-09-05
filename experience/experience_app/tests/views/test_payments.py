"""Pago simulado: aprueba sin tocar Odoo, deja huella en el log y valida lo mínimo."""
import logging
from unittest.mock import patch

import pytest
from django.urls import reverse

from experience_app.models import TableSession

PAYLOAD = {'restaurante': 'burger-house', 'sede': 'poblado', 'token': '8H2KQ7'}


@pytest.fixture
def session_id(api_client, table_tenant):
    return api_client.post(reverse('open-session'), PAYLOAD, format='json').json()['sesion']['id']


@pytest.mark.django_db
def test_simulated_payment_is_approved_logged_and_never_reaches_odoo(api_client, session_id, caplog):
    """Atrapa un pago demo que cree un pos.payment, cambie la sesión o no deje rastro en el log."""
    with patch('experience_app.adapters.odoo.client.OdooClient.call_kw') as call_kw, caplog.at_level(logging.INFO):
        response = api_client.post(reverse('simulated-payment', args=[session_id]), {'metodo': 'Tarjeta', 'monto': 97812}, format='json')
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
    assert api_client.post(url, {'metodo': 'nequi', 'monto': -1}, format='json').status_code == 400
    assert api_client.post(url, {'metodo': 'nequi', 'monto': 'mucho'}, format='json').status_code == 400
    assert api_client.__class__().post(url, {'metodo': 'nequi', 'monto': 10}, format='json').status_code == 404
