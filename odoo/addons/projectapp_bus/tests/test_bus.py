"""Avisos en vivo del POS. Corren con el runner de Odoo
(`-u projectapp_bus --test-enable --test-tags /projectapp_bus`)."""
from odoo.addons.projectapp_bus.models.bus import keep_allowed, waiter_channels
from odoo.tests import TransactionCase, tagged


@tagged("post_install", "-at_install")
class TestWaiterBus(TransactionCase):
    def setUp(self):
        super().setUp()
        self.config = self.env["pos.config"].search([("module_pos_restaurant", "=", True)], limit=1) or self.env["pos.config"].search([], limit=1)
        self.assertTrue(self.config, "hace falta un pos.config (demo)")
        self.Bus = self.env["waiter.bus"]

    def test_the_event_reaches_the_channel_of_its_terminal_only(self):
        """Atrapa un aviso que se cuele en el canal de otro terminal, o un evento inventado."""
        self.assertEqual(waiter_channels([7, 3, 3, 0, None], "kitchen"), ["waiter_pos_3", "waiter_pos_7"])
        self.assertEqual(waiter_channels([7], "lo_que_sea"), [], "un evento que no existe no se manda")
        self.assertEqual(waiter_channels([], "kitchen"), [])
        self.assertTrue(self.Bus.waiter_send([self.config.id], "kitchen"))
        self.assertFalse(self.Bus.waiter_send([self.config.id], "lo_que_sea"))

    def test_the_handshake_data_comes_from_the_server(self):
        """La versión del websocket la fija Odoo y cambia entre versiones: el POS la pregunta, no la fija."""
        from odoo.addons.bus.websocket import WebsocketConnectionHandler

        info = self.Bus.waiter_bus_info()
        self.assertEqual(info["version"], WebsocketConnectionHandler._VERSION)
        self.assertIn("waiter_pos_%s" % self.config.id, info["channels"])

    def test_only_pos_users_may_listen_to_a_terminal(self):
        """Odoo deja que el cliente pida cualquier canal por su nombre: el filtro es cosa nuestra."""
        channel = "waiter_pos_%s" % self.config.id
        self.assertEqual(keep_allowed([channel, "broadcast"], False), ["broadcast"], "quien no es del POS no escucha el terminal")
        self.assertEqual(keep_allowed([channel, "broadcast"], True), [channel, "broadcast"])
