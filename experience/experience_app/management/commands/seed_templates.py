"""`manage.py seed_templates`: siembra (upsert) el catálogo de plantillas desde experience_app/plantillas/catalogo/.

Lo mismo corre solo al terminar `migrate` (señal post_migrate en apps.py); el comando existe para volver a sembrar
sin migrar, por ejemplo tras `tools/diseno/sincronizar_catalogo.py`.
"""
from django.core.management.base import BaseCommand

from experience_app.plantillas.seed import seed


class Command(BaseCommand):
    help = 'Siembra (upsert) las plantillas del menú desde experience_app/plantillas/catalogo/*.json'

    def add_arguments(self, parser):
        parser.add_argument('--database', default='default')

    def handle(self, *args, **options):
        result = seed(using=options['database'])
        self.stdout.write(f"plantillas: {result['creadas']} creadas, {result['actualizadas']} actualizadas "
                          f"({', '.join(result['codigos']) or 'catálogo vacío'})")
