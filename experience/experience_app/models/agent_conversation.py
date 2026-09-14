import uuid

from django.db import models


class AgentConversation(models.Model):
    """Identity is supplied by a trusted transport adapter, never by the model."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.SlugField(max_length=60)
    venue = models.SlugField(max_length=60)
    channel = models.CharField(max_length=16)
    participant = models.CharField(max_length=100)
    history = models.JSONField(default=list)
    lease_until = models.DateTimeField(null=True)
    lease_token = models.UUIDField(null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant', 'venue', 'channel', 'participant'],
                                               name='agent_conversation_identity')]


class AgentDailyUsage(models.Model):
    restaurant = models.SlugField(max_length=60)
    day = models.DateField()
    attempts = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant', 'day'], name='agent_daily_restaurant')]


class AgentCartSelection(models.Model):
    """One explicit card selection; retries cannot add it twice, even after a reload."""
    diner = models.ForeignKey('experience_app.Diner', on_delete=models.CASCADE)
    message_id = models.UUIDField()
    product_id = models.PositiveIntegerField()
    qty = models.PositiveIntegerField()
    note = models.CharField(max_length=200, blank=True)
    line = models.ForeignKey('experience_app.CartLine', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['diner', 'message_id', 'product_id'], name='agent_card_selection')]
