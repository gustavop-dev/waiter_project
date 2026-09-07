from . import controllers
from . import models


def post_init_hook(env):
    """Siembra presets, programa de puntos y empleados demo la primera vez (idempotente: `waiter.seed.seed_kit`)."""
    env["waiter.seed"].seed_kit()
