from django.db import models


class DinerFavorite(models.Model):
    """Personal favorites, scoped to the restaurant whose product IDs they reference."""
    account = models.ForeignKey('experience_app.DinerAccount', on_delete=models.CASCADE, related_name='favorites')
    restaurant_slug = models.SlugField(max_length=60)
    venue_slug = models.SlugField(max_length=60)
    product_id = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['account', 'restaurant_slug', 'venue_slug', 'product_id'], name='unique_diner_favorite')]
