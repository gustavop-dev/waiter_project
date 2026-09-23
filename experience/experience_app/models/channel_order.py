import uuid

from django.db import models


class ChannelOrder(models.Model):
    """Resumen aceptable por un canal externo; no ocupa mesa ni crea pagos."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant_slug = models.SlugField(max_length=60)
    venue_slug = models.SlugField(max_length=60)
    idempotency_key = models.UUIDField()
    customer = models.JSONField()
    lines = models.JSONField()
    quote = models.JSONField()
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    result = models.JSONField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=['restaurant_slug', 'venue_slug', 'idempotency_key'], name='channel_order_unique_request')]
