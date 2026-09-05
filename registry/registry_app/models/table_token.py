from django.db import models

from registry_app.utils.tokens import generate_token


class TableToken(models.Model):
    """Token público de una mesa. Único por sede: la colisión deja de ser probabilística."""

    venue = models.ForeignKey("registry_app.Venue", on_delete=models.CASCADE, related_name="tokens")
    token = models.CharField(max_length=12, default=generate_token)
    odoo_table_id = models.PositiveIntegerField()
    table_number = models.PositiveIntegerField()
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["venue", "token"], name="uniq_token_per_venue")]

    def __str__(self) -> str:
        return f"{self.venue}/t/{self.token}"
