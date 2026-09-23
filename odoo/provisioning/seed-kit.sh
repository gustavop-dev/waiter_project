#!/usr/bin/env bash
# Siembra en un Odoo ya instalado lo que el kit CloudPos necesita (Plan I): presets Dine In / Takeout / Delivery,
# programa «Puntos Waiter» y los empleados demo Sofía Mesera (PIN 123456), Carlos Cajero (PIN 654321) y
# Laura Encargada (PIN 112233, administradora).
# Idempotente: llama a env['waiter.seed'].seed_kit() (projectapp_ops). El post_init_hook lo hace solo al instalar;
# tras un `-u projectapp_ops` hay que correr este script una vez.
# Uso: odoo/provisioning/seed-kit.sh [db] [proyecto-compose]   (por defecto: projectapp, odoo-spike)
set -u
DB=${1:-projectapp}; PROJECT=${2:-odoo-spike}; HERE=$(cd "$(dirname "$0")" && pwd); C="$HERE/../compose/docker-compose.yml"
docker compose -p "$PROJECT" -f "$C" exec -T odoo odoo shell -d "$DB" --db_host db --log-level=error <<'PY' 2>&1 | grep MARK
summary = env['waiter.seed'].seed_kit()
env.cr.commit()
print('MARK kit sembrado:', summary)
PY
