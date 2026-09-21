from django.db import models


class CredentialRelease(models.Model):
    """Cada vez que el registro entrega las credenciales de Odoo de un inquilino. No guarda la credencial.

    Sirve para responder a un incidente: si se compromete quien las pide (hoy, la experiencia), dice exactamente qué
    restaurantes quedaron expuestos y desde cuándo, para rotar solo esas contraseñas en vez de todas. Se guarda el
    nombre del restaurante y de la sede además del vínculo, para que el rastro sobreviva si la sede se borra.
    """

    venue = models.ForeignKey("registry_app.Venue", on_delete=models.SET_NULL, null=True, related_name="credential_releases")
    restaurant_slug = models.SlugField(max_length=80)
    venue_slug = models.SlugField(max_length=80)
    with_table = models.BooleanField(help_text="La petición traía un token de mesa válido.")
    client = models.GenericIPAddressField(null=True, blank=True, help_text="Dirección de quien pidió la resolución.")
    released_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-released_at"]

    def __str__(self) -> str:
        return f"{self.restaurant_slug}/{self.venue_slug} @ {self.released_at:%Y-%m-%d %H:%M}"
