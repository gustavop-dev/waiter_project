from django.db import models


class DinerFeedback(models.Model):
    order = models.ForeignKey('experience_app.Order', on_delete=models.CASCADE, related_name='feedback')
    diner = models.ForeignKey('experience_app.Diner', on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField()
    comment = models.CharField(max_length=250, blank=True)
    dish_ratings = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['order', 'diner'], name='unique_diner_order_feedback'),
            models.CheckConstraint(condition=models.Q(rating__gte=1, rating__lte=5), name='feedback_rating_1_to_5'),
        ]
