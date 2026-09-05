from django.db import models


class Restaurant(models.Model):
    """Inquilino del SaaS. Su slug es el primer segmento de toda URL pública."""

    slug = models.SlugField(max_length=60, unique=True)
    name = models.CharField(max_length=120)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.slug
