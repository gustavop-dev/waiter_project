"""Qué inquilinos recibieron sus credenciales de Odoo desde una fecha: la lista para rotar tras un incidente.

    manage.py credential_releases --since 2026-09-21
    manage.py credential_releases --since 2026-09-21T14:00
"""

from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count, Max
from django.utils import timezone

from registry_app.models import CredentialRelease


class Command(BaseCommand):
    help = "Inquilinos cuyas credenciales de Odoo entregó el registro desde una fecha (para rotarlas tras un incidente)."

    def add_arguments(self, parser):
        parser.add_argument("--since", required=True, help="Fecha u hora ISO desde la que contar (hora local del servidor).")

    def handle(self, *args, since, **options):
        try:
            start = datetime.fromisoformat(since)
        except ValueError as error:
            raise CommandError(f"--since no es una fecha ISO válida: {since}") from error
        if timezone.is_naive(start):
            start = timezone.make_aware(start)
        rows = (CredentialRelease.objects.filter(released_at__gte=start)
                .values("restaurant_slug", "venue_slug").annotate(times=Count("id"), last=Max("released_at"))
                .order_by("restaurant_slug", "venue_slug"))
        if not rows:
            self.stdout.write("Ninguna entrega de credenciales en ese periodo.")
            return
        for row in rows:
            self.stdout.write(f"{row['restaurant_slug']}/{row['venue_slug']}\t{row['times']} veces\túltima {row['last']:%Y-%m-%d %H:%M}")
        self.stdout.write(f"{len(rows)} inquilinos para rotar.")
