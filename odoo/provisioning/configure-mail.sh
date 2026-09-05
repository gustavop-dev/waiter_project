#!/usr/bin/env bash
# Configura el servidor de correo saliente de una base de Odoo a partir de SMTP_* en compose/.env.
# Uso: odoo/provisioning/configure-mail.sh [db]   (por defecto: projectapp)
set -u
DB=${1:-projectapp}; HERE=$(cd "$(dirname "$0")" && pwd); C="$HERE/../compose/docker-compose.yml"
docker compose -p odoo-spike -f "$C" exec -T odoo odoo shell -d "$DB" --db_host db --log-level=error <<'PY' 2>&1 | grep MARK
import os
cfg = {k: os.environ.get(k, '') for k in ('SMTP_HOST', 'SMTP_PORT', 'SMTP_ENCRYPTION', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM')}
assert cfg['SMTP_HOST'] and cfg['SMTP_PASSWORD'], 'faltan SMTP_* en compose/.env'
S = env['ir.mail_server']
vals = {'name': 'ProjectApp', 'smtp_host': cfg['SMTP_HOST'], 'smtp_port': int(cfg['SMTP_PORT'] or 465), 'smtp_encryption': cfg['SMTP_ENCRYPTION'] or 'ssl',
        'smtp_user': cfg['SMTP_USER'], 'smtp_pass': cfg['SMTP_PASSWORD'], 'from_filter': cfg['SMTP_FROM'], 'sequence': 1}
s = S.search([('name', '=', 'ProjectApp')], limit=1)
s.write(vals) if s else S.create(vals)
env['ir.config_parameter'].sudo().set_param('mail.default.from', cfg['SMTP_FROM'])
env.cr.commit()
print('MARK correo saliente:', cfg['SMTP_HOST'], cfg['SMTP_PORT'], cfg['SMTP_ENCRYPTION'], 'desde', cfg['SMTP_FROM'])
PY
