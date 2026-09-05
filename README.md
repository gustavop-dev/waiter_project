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
- Diseño y decisiones en `docs/`; planes ejecutados en `docs/planes/`.

## Levantar el entorno de desarrollo

Todo escucha en la interfaz host-only `192.168.56.10` (el navegador corre en
la anfitriona).

```bash
# Odoo (motor POS) — addons propios: projectapp_pos_design, projectapp_kitchen
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

# Recorrido del comensal por curl (mesa 8 de la demo)
scripts/demo-comensal.sh
```

## Próximos pasos

1. Pasarela de pago en el bloque 3 (`experience/pagos`): al `pago aprobado`,
   registrar el pago en Odoo y emitir el evento para facturación.
2. Plan C: dashboard de ROI y operación en vivo.
3. PWA del comensal y Mesero IA sobre la API del bloque 3.
