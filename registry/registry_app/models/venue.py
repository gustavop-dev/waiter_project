from django.db import models

from registry_app.utils import crypto


class Venue(models.Model):
    """Sede de un restaurante: apunta a UNA base de Odoo y a un pos.config (el canal de autoservicio)."""

    restaurant = models.ForeignKey("registry_app.Restaurant", on_delete=models.CASCADE, related_name="venues")
    slug = models.SlugField(max_length=60)
    name = models.CharField(max_length=120)
    odoo_url = models.URLField()
    odoo_db = models.CharField(max_length=63)
    odoo_login = models.CharField(max_length=120)
    odoo_secret = models.TextField(help_text="Contraseña del usuario de servicio, cifrada con Fernet.")
    pos_config_id = models.PositiveIntegerField()
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["restaurant", "slug"], name="uniq_venue_slug_per_restaurant")]

    def __str__(self) -> str:
        return f"{self.restaurant.slug}/{self.slug}"

    @property
    def odoo_password(self) -> str:
        return crypto.decrypt(self.odoo_secret)

    @odoo_password.setter
    def odoo_password(self, plain: str) -> None:
        self.odoo_secret = crypto.encrypt(plain)
