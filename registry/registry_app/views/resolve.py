"""Resolución jerárquica restaurante → sede → mesa para el bloque 3. Interna: clave compartida."""

import hmac

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from registry_app.models import TableToken, Venue


def _authorized(request) -> bool:
    given = request.headers.get("X-Internal-Key", "")
    return bool(settings.REGISTRY_INTERNAL_KEY) and hmac.compare_digest(given, settings.REGISTRY_INTERNAL_KEY)


def _table_payload(table: TableToken | None):
    return table and {"token": table.token, "number": table.table_number, "odoo_table_id": table.odoo_table_id}


@api_view(["GET"])
def resolve(request, restaurant, venue, token=None):
    if not _authorized(request):
        return Response({"detail": "clave interna inválida"}, status=401)
    site = (
        Venue.objects.select_related("restaurant")
        .filter(restaurant__slug=restaurant, restaurant__active=True, slug=venue, active=True)
        .first()
    )
    if site is None:
        return Response({"detail": "sede no encontrada"}, status=404)
    table = None
    if token is not None:
        table = site.tokens.filter(token=token, active=True).first()
        if table is None:
            return Response({"detail": "mesa no disponible"}, status=404)
    return Response(
        {
            "restaurant": {"slug": site.restaurant.slug, "name": site.restaurant.name, "brand": site.restaurant.brand()},
            "venue": {"slug": site.slug, "name": site.name},
            "table": _table_payload(table),
            "odoo": {
                "url": site.odoo_url,
                "db": site.odoo_db,
                "login": site.odoo_login,
                "password": site.odoo_password,
                "pos_config_id": site.pos_config_id,
            },
        }
    )
