"""Descuento de primera compra (Plan H): un porcentaje, una sola vez, sobre las líneas del comensal con cuenta verificada.

El porcentaje lo fija el restaurante en `pos.config.signup_discount_percent` (addon projectapp_ops) y llega con la carta
(load_data); si Odoo no lo entrega —addon sin actualizar, Odoo caído al consultar los ajustes— vale el 5 % del diseño.
Se aplica de verdad al confirmar (services/orders.py): las líneas viajan a Odoo con `discount` y la cuenta queda marcada
`discount_used_at`. El carrito y la cuenta lo exponen como `descuento: {porcentaje, monto, aplicable, aplicado}`.
"""
from decimal import Decimal

from experience_app.adapters.odoo.client import OdooError
from experience_app.adapters.registry.client import RegistryUnavailable, Tenant
from experience_app.models import CartLine, Diner
from experience_app.services import catalog

DEFAULT_PERCENT = 5.0


def percent_for(tenant: Tenant) -> float:
    try:
        return float(catalog.get_catalog(tenant).signup_discount_percent)
    except (OdooError, RegistryUnavailable):
        return DEFAULT_PERCENT


def applicable(diner: Diner) -> bool:
    """El comensal tiene una cuenta verificada que aún no usó su descuento."""
    account = diner.account
    return account is not None and account.discount_available


def view(lines: list[CartLine], diner: Diner, percent: float) -> dict:
    """Sobre las líneas del comensal: `monto` es lo ya descontado en las confirmadas más lo que descontará en las abiertas."""
    mine = [line for line in lines if line.diner_id == diner.id]
    applied = sum((line.discount_amount for line in mine if line.discount), Decimal(0))
    projected = Decimal(0)
    can_apply = percent > 0 and applicable(diner)
    if can_apply:
        pending = sum((line.subtotal for line in mine if line.status == CartLine.OPEN and not line.discount), Decimal(0))
        projected = (pending * Decimal(str(percent)) / 100).quantize(Decimal('0.01'))
    return {'porcentaje': percent, 'monto': float(applied + projected), 'aplicable': can_apply, 'aplicado': applied > 0}
