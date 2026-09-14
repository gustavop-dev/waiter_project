"""Provider-neutral configuration and durable attempts; no card data or API payloads."""
import uuid

from django.db import models


class PaymentGateway(models.Model):
    restaurant_slug = models.SlugField(max_length=60)
    venue_slug = models.SlugField(max_length=60)
    provider = models.SlugField(default='wompi')
    environment = models.CharField(max_length=10, default='test')
    enabled = models.BooleanField(default=False)
    public_key = models.CharField(max_length=200, blank=True)
    secrets_cipher = models.TextField(blank=True)
    payment_method_id = models.PositiveIntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['restaurant_slug', 'venue_slug', 'provider', 'environment'], name='unique_venue_gateway_environment'),
                       models.UniqueConstraint(fields=['restaurant_slug', 'venue_slug'], condition=models.Q(enabled=True), name='one_active_gateway_per_venue')]


class PaymentAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gateway = models.ForeignKey(PaymentGateway, on_delete=models.PROTECT)
    session = models.ForeignKey('TableSession', on_delete=models.PROTECT, related_name='payments')
    diner = models.ForeignKey('Diner', on_delete=models.PROTECT)
    order = models.ForeignKey('Order', on_delete=models.PROTECT)
    amount_in_cents = models.PositiveBigIntegerField()
    method = models.CharField(max_length=40)
    status = models.CharField(max_length=20, default='CREATING')
    provider_id = models.CharField(max_length=100, blank=True)
    # Immutable credentials snapshot lets in-flight payments survive administrator rotation.
    credentials_cipher = models.TextField()
    payment_method_id = models.PositiveIntegerField(null=True)
    reconciled = models.BooleanField(default=False)
    needs_review = models.BooleanField(default=False)
    qr_image = models.TextField(blank=True)
    challenge_html = models.TextField(blank=True)
    card_brand = models.CharField(max_length=20, blank=True)
    redirect_url = models.URLField(max_length=2048, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    checked_at = models.DateTimeField(null=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['session'], condition=models.Q(status__in=['CREATING', 'UNKNOWN', 'PENDING', 'APPROVED']), name='one_unresolved_payment_per_visit')]

    @property
    def reference(self):
        return f'waiter-{self.id.hex}'
