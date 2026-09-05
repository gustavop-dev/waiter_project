#!/usr/bin/env bash
# Siembra en Odoo los parámetros que usa /waiter/admin/menu_settings (Plan H) para hablar con experience/.
# Uso: odoo/provisioning/seed-menu-params.sh [db]   (por defecto: projectapp)
# Variables (con valores de la VM de desarrollo por defecto):
#   EXPERIENCE_URL          http://192.168.56.10:8001
#   EXPERIENCE_INTERNAL_KEY el mismo valor que experience/.env → EXPERIENCE_INTERNAL_KEY (obligatoria)
#   RESTAURANT_SLUG         burger-house
#   VENUE_SLUG              poblado
#   DINER_URL               http://192.168.56.10:3001
set -u
DB=${1:-projectapp}; HERE=$(cd "$(dirname "$0")" && pwd); C="$HERE/../compose/docker-compose.yml"
: "${EXPERIENCE_INTERNAL_KEY:?falta EXPERIENCE_INTERNAL_KEY (el de experience/.env)}"
export EXPERIENCE_URL=${EXPERIENCE_URL:-http://192.168.56.10:8001} RESTAURANT_SLUG=${RESTAURANT_SLUG:-burger-house} \
       VENUE_SLUG=${VENUE_SLUG:-poblado} DINER_URL=${DINER_URL:-http://192.168.56.10:3001} EXPERIENCE_INTERNAL_KEY
docker compose -p odoo-spike -f "$C" exec -T \
  -e EXPERIENCE_URL -e EXPERIENCE_INTERNAL_KEY -e RESTAURANT_SLUG -e VENUE_SLUG -e DINER_URL \
  odoo odoo shell -d "$DB" --db_host db --log-level=error <<'PY' 2>&1 | grep MARK
import os
icp = env['ir.config_parameter'].sudo()
for key, var in (('projectapp.experience_url', 'EXPERIENCE_URL'), ('projectapp.experience_internal_key', 'EXPERIENCE_INTERNAL_KEY'),
                 ('projectapp.restaurant_slug', 'RESTAURANT_SLUG'), ('projectapp.venue_slug', 'VENUE_SLUG'), ('projectapp.diner_url', 'DINER_URL')):
    icp.set_param(key, os.environ[var])
env.cr.commit()
print('MARK plantillas del menú:', os.environ['EXPERIENCE_URL'], '→', os.environ['RESTAURANT_SLUG'] + '/' + os.environ['VENUE_SLUG'], '· comensal', os.environ['DINER_URL'])
PY
