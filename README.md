# waiter_project — ProjectApp Smart Restaurant

SaaS para restaurantes que automatiza la atención en mesa: el comensal toca
un NFC, consulta la carta, conversa con un Mesero IA, pide, paga y recibe su
factura electrónica sin depender permanentemente de un mesero.

> **Opera más mesas con menos carga operativa.**

La descripción completa del producto está en
[`docs/producto/vision.md`](docs/producto/vision.md).

## Estado

- **Odoo Community 19** evaluado y adoptado como motor operativo *headless*
  (POS, catálogo, impuestos, contabilidad). Una base por restaurante. Nadie
  usa su interfaz.
- **`pos/`**: app Next.js del operador. Plano de salón y toma de pedido
  funcionan de punta a punta contra Odoo real (login, catálogo, pedido en
  mesa, envío a cocina, cobro), con contratos y E2E verdes.
- **KDS de cocina** (`/kds` en `pos/`) sobre los cursos de Odoo con el addon
  propio `projectapp_kitchen` (listo / entregado / estación). Plan B.
- **`registry/`**: registro central mínimo (restaurantes, sedes, tokens de
  mesa únicos, credenciales cifradas) con resolución interna.
- **`experience/`**: backend del bloque 3. Carta desde caché, sesión de mesa
  con comensales por cookie, carrito compartido con atribución por persona,
  confirmación idempotente hacia Odoo y estado del pedido. Plan D.
- **Backoffice del operador** en `pos/`: operación en vivo (1e), ROI (1d),
  ventas, catálogo, inventario, clientes, facturación normal y configuración.
  Plan C. Sonidos del sistema Waiter sintetizados en el navegador.
  **Configuración › Marca** (Plan G, solo administradores): logo, color de
  acción, tipografía, redondeo, lema, saludo, nombre del mesero IA y
  bienvenida; se guarda en Odoo (`res.company`, addon `projectapp_ops`) y el
  registro conserva el valor inicial del onboarding como fallback.
- **`diner/`**: la app del comensal (PWA móvil, marca del restaurante). Solo
  habla con `experience/`; nada suyo toca Odoo ni `pos/`. Plan F. La marca
  que pinta la sirve `experience/` (Odoo > registro, caché
  `BRAND_CACHE_SECONDS`, 60 s por defecto en `experience/.env`).
- Diseño y decisiones en `docs/`; planes ejecutados en `docs/planes/`.

## Levantar el entorno de desarrollo

Todo escucha en la interfaz host-only `192.168.56.10` (el navegador corre en
la anfitriona).

```bash
# Odoo (motor POS) — addons propios: projectapp_pos_design, projectapp_kitchen, projectapp_ops
docker compose -p odoo-spike -f odoo/compose/docker-compose.yml up -d        # :8069

# App del operador (salón, pedido, KDS)
cd pos && npm ci && npx next dev --hostname 192.168.56.10 --port 3000        # :3000

# Registro central y bloque 3 (Python 3.12+, venv por servicio)
cd registry && python3 -m venv venv && venv/bin/pip install -r requirements.txt \
  && cp .env.example .env && venv/bin/python manage.py migrate && venv/bin/python manage.py seed_demo \
  && venv/bin/python manage.py runserver 192.168.56.10:8002
cd experience && python3 -m venv venv && venv/bin/pip install -r requirements.txt \
  && cp .env.example .env && venv/bin/python manage.py migrate \
  && venv/bin/python manage.py runserver 192.168.56.10:8001

# App del comensal
cd diner && npm ci && npm run dev                                          # :3001 · /burger-house/poblado/t/<token>

# Recorrido del comensal por curl (mesa 8 de la demo)
scripts/demo-comensal.sh
```

- **POS cerrado (Plan E)**: cobro completo (pagos mixtos, datáfono manual, propina,
  dividir, recibo), caja con arqueo, roles (mesero / cajero / administrador),
  buscar plato, nota a cocina, fotos, buscar mesa. `pos/` es PWA instalable.

## Próximos pasos

1. Pasarela de pago en el bloque 3 (`experience/pagos`): al `pago aprobado`,
   registrar el pago en Odoo y emitir el evento para facturación.
2. Mesero IA sobre la API del bloque 3 (la PWA del comensal ya existe, Plan F;
   la marca ya se edita desde el POS, Plan G).
3. Fotos de portada del restaurante y varios idiomas del comensal (fuera del
   Plan G a propósito).
