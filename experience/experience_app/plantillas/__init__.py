"""Plantillas del menú (Plan H): catálogo canónico, ajustes por sede y la plantilla resuelta que ve el comensal.

- `catalogo/<codigo>.json`: la especificación (Contrato 1) copiada del diseño por `tools/diseno/sincronizar_catalogo.py`.
- `miniaturas/<codigo>.png`: la captura del menú de cada plantilla, servida por `/api/v1/plantillas/<codigo>/miniatura/`.
- `models.py`: `MenuTemplate` (una fila por JSON) y `VenueMenuSettings` (elección y personalización por sede).
- `seed.py`: upsert del catálogo en la base (comando `seed_templates` y señal `post_migrate`).
- `services.py`: `resolve_template(tenant)` (Contrato 3) y la validación del PUT interno.
"""
