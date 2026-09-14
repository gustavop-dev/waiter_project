"""Payment providers. Business state belongs to services, not to provider adapters."""
from . import wompi

PROVIDERS = {'wompi': wompi}
