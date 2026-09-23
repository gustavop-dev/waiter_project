"""Public dish ratings, aggregated from diners who ordered the dish at this venue."""
from collections import defaultdict

from django.core.cache import cache

from experience_app.models import DinerFeedback


def _key(restaurant, venue):
    return f'dish-ratings:{restaurant}/{venue}'


def invalidate(restaurant, venue):
    cache.delete(_key(restaurant, venue))


def for_menu(restaurant, venue):
    def aggregate():
        values = defaultdict(list)
        rows = DinerFeedback.objects.filter(
            order__session__restaurant_slug=restaurant,
            order__session__venue_slug=venue,
        ).values_list('dish_ratings', flat=True).iterator()
        for row in rows:
            for product_id, rating in row.items():
                if str(product_id).isdigit() and type(rating) is int and 1 <= rating <= 5:
                    values[int(product_id)].append(rating)
        return {product_id: {'promedio': round(sum(scores) / len(scores), 1), 'cantidad': len(scores)}
                for product_id, scores in values.items()}
    return cache.get_or_set(_key(restaurant, venue), aggregate, 60)
