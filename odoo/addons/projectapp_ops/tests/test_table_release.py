"""El cobro apaga el aviso de la mesa, sin pedirle al cajero permisos de servicio.

Corren con `scripts/odoo-test.sh projectapp_ops TestTableRelease`, nunca contra el Odoo compartido.
"""
from odoo.tests import tagged

from .test_kit import KitCase


@tagged('post_install', '-at_install')
class TestTableRelease(KitCase):
    def setUp(self):
        super().setUp()
        self.floor, self.tables = self._floor_with_tables(2)

    def _pay(self, order):
        order.add_payment({'pos_order_id': order.id,
                           'payment_method_id': self.config.payment_method_ids[:1].id,
                           'amount': order.amount_total})
        order.action_pos_order_paid()

    def test_paying_turns_off_the_table_call(self):
        """Falla si tras cobrar la mesa sigue llamando: el aviso quedaba encendido porque lo apagaba el
        navegador del cajero, que no tiene permiso para atender mesas (`serve_orders`)."""
        table = self.tables[0]
        table.set_waiter_call('bill')
        self._pay(self._order(table=table))
        self.assertEqual(table.waiter_call, 'none')

    def test_a_second_open_bill_keeps_the_call(self):
        """Falla si cobrar una cuenta apaga el aviso de otra que sigue abierta en la misma mesa."""
        table = self.tables[1]
        table.set_waiter_call('assist')
        abierta = self._order(table=table)
        self._pay(self._order(table=table))
        self.assertEqual(abierta.state, 'draft')
        self.assertEqual(table.waiter_call, 'assist', 'la llamada puede ser de la cuenta que sigue abierta')
