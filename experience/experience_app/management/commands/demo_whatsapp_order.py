"""Simula el puente interno sin conectar Meta ni consumir IA."""
import json
from uuid import uuid4

from django.core.management.base import BaseCommand, CommandError

from experience_app.services import channel_orders
from experience_app.views.channel_orders import OrderSerializer


class Command(BaseCommand):
    help = 'Cotiza un pedido para recoger; --confirmar lo envía al POS/cocina sin pago.'

    def add_arguments(self, parser):
        parser.add_argument('restaurante')
        parser.add_argument('sede')
        parser.add_argument('producto', type=int)
        parser.add_argument('--cantidad', type=int, default=1)
        parser.add_argument('--nombre', default='Demo WhatsApp')
        parser.add_argument('--telefono', default='+573000000000')
        parser.add_argument('--referencia', default=None, help='UUID estable para repetir la misma operación.')
        parser.add_argument('--confirmar', action='store_true')

    def handle(self, *args, **options):
        body = OrderSerializer(data={
            'idempotencia': options['referencia'] or str(uuid4()),
            'cliente': {'nombre': options['nombre'], 'telefono': options['telefono']},
            'lineas': [{'producto': options['producto'], 'cantidad': options['cantidad'], 'nota': 'Demostración WhatsApp'}],
        })
        if not body.is_valid():
            raise CommandError(str(body.errors))
        order, _ = channel_orders.create(options['restaurante'], options['sede'], body.validated_data)
        if options['confirmar']:
            order = channel_orders.confirm(order, order.quote['cotizacion'])
        self.stdout.write(json.dumps({'idempotencia': str(order.idempotency_key),
                                     **channel_orders.representation(order)}, ensure_ascii=False, indent=2))
