from unittest.mock import patch

import pytest
from django.urls import reverse

from experience_app.adapters.odoo.client import OdooUnavailable
from experience_app.adapters.odoo.pos import OdooOrder, OrderStatus
from experience_app.models import CartLine, Order
from experience_app.tests.conftest import TABLE

PAYLOAD = {'restaurante': 'burger-house', 'sede': 'poblado', 'token': '8H2KQ7'}
SENT = OdooOrder(id=13, reference='260-1-1', state='draft', total=87822, tax=14022, paid=0)


@pytest.fixture
def odoo():
    with patch('experience_app.services.orders.resolve', return_value=TABLE), patch('experience_app.services.orders.OdooClient'), \
            patch('experience_app.services.orders.pos.ensure_open_session', return_value=4), \
            patch('experience_app.services.orders.pos.create_order', return_value=SENT) as create, \
            patch('experience_app.services.orders.pos.fire_course', return_value=21) as fire:
        yield create, fire


@pytest.fixture
def cart(api_client, table_tenant, catalog_stub):
    sid = api_client.post(reverse('open-session'), PAYLOAD, format='json').json()['sesion']['id']
    api_client.post(reverse('add-line', args=[sid]), {'producto_id': 3, 'cantidad': 2}, format='json')
    return sid


@pytest.mark.django_db
def test_confirm_sends_the_cart_to_odoo_with_the_order_uuid_and_fires_the_kitchen(api_client, cart, odoo):
    """Atrapa un pedido que llega a Odoo sin uuid (duplicable) o que no va a cocina."""
    create, fire = odoo
    body = api_client.post(reverse('confirm', args=[cart]), format='json').json()
    assert create.call_args.kwargs['order_uuid'] == body['pedido']
    assert create.call_args.kwargs['table_id'] == 9
    assert fire.call_args.args[1] == 13
    assert body['total'] == 87822.0
    assert CartLine.objects.filter(status=CartLine.CONFIRMED).count() == 1


@pytest.mark.django_db
def test_when_odoo_is_down_the_cart_survives_and_the_retry_reuses_the_uuid(api_client, cart, odoo):
    """Atrapa un carrito perdido por una caída de Odoo, o un reintento que crea otro pedido."""
    create, _ = odoo
    create.side_effect = [OdooUnavailable('down'), SENT]
    first = api_client.post(reverse('confirm', args=[cart]), format='json')
    assert first.status_code == 503
    assert CartLine.objects.filter(status=CartLine.OPEN).count() == 1
    retry = api_client.post(reverse('confirm', args=[cart]), format='json').json()
    assert str(Order.objects.get().id) == retry['pedido']
    assert create.call_args_list[0].kwargs['order_uuid'] == create.call_args_list[1].kwargs['order_uuid']


@pytest.mark.django_db
def test_confirming_twice_without_new_lines_returns_the_same_order_without_calling_odoo(api_client, cart, odoo):
    """Atrapa el doble toque en "confirmar": el segundo no debe llegar a Odoo."""
    create, _ = odoo
    first = api_client.post(reverse('confirm', args=[cart]), format='json').json()
    again = api_client.post(reverse('confirm', args=[cart]), format='json')
    assert again.status_code == 200
    assert again.json()['pedido'] == first['pedido']
    assert create.call_count == 1


@pytest.mark.django_db
@patch('experience_app.services.orders.pos.read_order_status', return_value=OrderStatus(state='draft', kitchen='ready'))
def test_order_status_maps_odoo_state_and_kitchen_phase(read, api_client, cart, odoo):
    """Atrapa un estado del pedido que no refleje lo que cocina marcó."""
    order_id = api_client.post(reverse('confirm', args=[cart]), format='json').json()['pedido']
    body = api_client.get(reverse('order-detail', args=[order_id])).json()
    assert body['estado'] == 'listo'
    assert body['total'] == 87822.0


@pytest.mark.django_db
def test_order_detail_requires_a_diner_of_that_table(api_client, cart, odoo):
    """Atrapa el IDOR: con el uuid del pedido, alguien de otra mesa no debe ver su estado."""
    order_id = api_client.post(reverse('confirm', args=[cart]), format='json').json()['pedido']
    stranger = api_client.__class__()
    assert stranger.get(reverse('order-detail', args=[order_id])).status_code == 404
