"""Plano versionado y reparto de zonas por sesión; guardar nunca abre una caja."""
import base64
import binascii
import math
import re
from odoo import api, fields, models, _
from odoo.exceptions import AccessError, UserError


def authorize(env, employee_id, token):
    employee = env['hr.employee'].sudo().browse(employee_id).exists()
    if (env.user.waiter_role != 'admin' or not employee or not employee.active or
            employee.company_id not in env.companies or employee.waiter_role != 'admin' or
            not employee._waiter_session_ok(token)):
        raise AccessError(env._('Valida el PIN de un administrador para modificar el plano o las zonas.'))


def rectangle(item):
    for key in ('x', 'y', 'width', 'height'):
        v = item.get(key)
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0 or v > 20000:
            raise UserError(_('Las dimensiones del plano no son válidas.'))
    if item['width'] < 20 or item['height'] < 20 or item['x'] + item['width'] > 20000 or item['y'] + item['height'] > 20000:
        raise UserError(_('Los elementos deben medir al menos una celda.'))


def overlap(a, b, gap=0):
    return (a['x'] < b['x'] + b['width'] + gap and a['x'] + a['width'] + gap > b['x'] and
            a['y'] < b['y'] + b['height'] + gap and a['y'] + a['height'] + gap > b['y'])


class Floor(models.Model):
    _inherit = 'restaurant.floor'
    waiter_plan = fields.Json(default=lambda self: {'walls': [], 'zones': []})
    waiter_plan_revision = fields.Integer(default=0)

    def waiter_read_plan(self):
        self.ensure_one()
        self.check_access('read')
        return {'id': self.id, 'name': self.name, 'revision': self.waiter_plan_revision,
                'backgroundSize': (self.waiter_plan or {}).get('backgroundSize'),
                'walls': (self.waiter_plan or {}).get('walls', []), 'zones': (self.waiter_plan or {}).get('zones', []),
                'tables': [{'id': t.id, 'key': str(t.id), 'number': t.table_number, 'seats': t.seats,
                            'x': t.position_h, 'y': t.position_v, 'width': t.width, 'height': t.height,
                            'zone': t.waiter_zone or ''} for t in self.table_ids.filtered('active')]}

    @api.model
    def waiter_save_plan(self, config_id, floor_id, plan, employee_id, token):
        authorize(self.env, employee_id, token)
        config = self.env['pos.config'].browse(config_id).exists()
        config.check_access('write')
        if not config:
            raise UserError(_('No existe el terminal.'))
        self.env.cr.execute('SELECT id FROM pos_config WHERE id = %s FOR UPDATE', [config.id])
        if self.env['pos.session'].search_count([('config_id', '=', config.id), ('state', '!=', 'closed')]):
            raise UserError(_('Cierra la caja antes de modificar el plano.'))
        floor = self.browse(floor_id).exists() if floor_id else self.browse()
        if floor_id and (not floor or config not in floor.pos_config_ids):
            raise UserError(_('El piso no pertenece a este terminal.'))
        if floor:
            floor.check_access('write')
            self.env.cr.execute('SELECT id FROM restaurant_floor WHERE id = %s FOR UPDATE', [floor.id])
            floor.invalidate_recordset()
            if plan.get('revision') != floor.waiter_plan_revision:
                raise UserError(_('Otra persona cambió el plano. Cancela y vuelve a abrirlo para cargar sus cambios.'))
        name = str(plan.get('name', '')).strip()
        if not name or len(name) > 100:
            raise UserError(_('Escribe un nombre de piso de hasta 100 caracteres.'))
        tables, walls, zones = (plan.get(k, []) for k in ('tables', 'walls', 'zones'))
        if not all(isinstance(v, list) and len(v) <= 500 for v in (tables, walls, zones)):
            raise UserError(_('El plano tiene demasiados elementos.'))
        zone_ids = set()
        for z in zones:
            rectangle(z)
            if not isinstance(z.get('id'), str) or not z['id'] or z['id'] in zone_ids or len(z['id']) > 80:
                raise UserError(_('Cada zona necesita un identificador único.'))
            if not str(z.get('name', '')).strip() or len(str(z['name'])) > 80 or not re.fullmatch(r'#[0-9a-fA-F]{6}', str(z.get('color', ''))):
                raise UserError(_('Escribe un nombre y un color válido para cada zona.'))
            zone_ids.add(z['id'])
        for wall in walls:
            rectangle(wall)
        ids, numbers = set(), set()
        for i, table in enumerate(tables):
            rectangle(table)
            for k in ('number', 'seats'):
                if type(table.get(k)) is not int or not 1 <= table[k] <= (9999 if k == 'number' else 100):
                    raise UserError(_('Revisa el número y la capacidad de cada mesa.'))
            if table['number'] in numbers or (table.get('zone') and table['zone'] not in zone_ids):
                raise UserError(_('Hay números de mesa repetidos o zonas inexistentes.'))
            numbers.add(table['number'])
            if table.get('id'):
                if type(table['id']) is not int or table['id'] in ids or table['id'] not in floor.table_ids.ids:
                    raise UserError(_('Una mesa no pertenece a este piso o está repetida.'))
                ids.add(table['id'])
            if any(overlap(table, other, 16) for other in tables[:i]) or any(overlap(table, w, 16) for w in walls):
                raise UserError(_('Separa las mesas entre sí y de las paredes antes de guardar.'))
        removed = floor.table_ids.filtered('active').filtered(lambda t: t.id not in ids) if floor else self.env['restaurant.table']
        if removed and self.env['pos.order'].search_count([('table_id', 'in', removed.ids), ('state', '=', 'draft')]):
            raise UserError(_('No puedes retirar mesas con pedidos pendientes.'))
        if removed and 'waiter.reservation' in self.env:
            # Una reserva futura debe reasignarse antes de retirar su mesa.
            R = self.env['waiter.reservation']
            if 'table_id' in R._fields and R.search_count([('table_id', 'in', removed.ids), ('state', '=', 'confirmed'), ('date', '>=', fields.Date.context_today(self))]):
                raise UserError(_('Reasigna las reservas de estas mesas antes de retirarlas.'))
        background_size = plan.get('backgroundSize', (floor.waiter_plan or {}).get('backgroundSize') if floor else None)
        if background_size is not None:
            if not isinstance(background_size, dict):
                raise UserError(_('El tamaño de la imagen no es válido.'))
            background_size = {k: background_size.get(k, 0) for k in ('x', 'y', 'width', 'height')}
            rectangle(background_size)
        image_values = {}
        if 'background' in plan:
            image = plan['background']
            if image is not None:
                try:
                    if not isinstance(image, str) or len(image) > 14 * 1024 * 1024:
                        raise ValueError()
                    decoded = base64.b64decode(image, validate=True)
                    if len(decoded) > 10 * 1024 * 1024 or not (decoded.startswith(b'\x89PNG\r\n\x1a\n') or decoded.startswith(b'\xff\xd8\xff')):
                        raise ValueError()
                except (ValueError, binascii.Error):
                    raise UserError(_('Usa una imagen PNG o JPG de hasta 10 MB.'))
            image_values['floor_background_image'] = image or False
        if not floor:
            floor = self.create({'name': name, 'pos_config_ids': [(4, config.id)]})
        floor.write({**image_values, 'name': name, 'waiter_plan': {'walls': walls, 'zones': zones, 'backgroundSize': background_size}, 'waiter_plan_revision': floor.waiter_plan_revision + 1})
        removed.write({'active': False})
        for table in tables:
            values = {'table_number': table['number'], 'seats': table['seats'], 'position_h': table['x'], 'position_v': table['y'],
                      'width': table['width'], 'height': table['height'], 'waiter_zone': table.get('zone', ''), 'shape': 'square'}
            if table.get('id'):
                self.env['restaurant.table'].browse(table['id']).write(values)
            else:
                self.env['restaurant.table'].create(dict(values, floor_id=floor.id))
        return floor.waiter_read_plan()


class Table(models.Model):
    _inherit = 'restaurant.table'
    waiter_zone = fields.Char(string='Zona del plano')


class Session(models.Model):
    _inherit = 'pos.session'
    waiter_zone_assignments = fields.Json(default=dict)

    @api.model_create_multi
    def create(self, vals_list):
        ids = sorted({v['config_id'] for v in vals_list if v.get('config_id')})
        if ids:
            self.env.cr.execute('SELECT id FROM pos_config WHERE id IN %s ORDER BY id FOR UPDATE', [tuple(ids)])
        return super().create(vals_list)

    def waiter_assign_zones(self, floor_id, assignments, employee_id, token):
        self.ensure_one()
        authorize(self.env, employee_id, token)
        self.check_access('write')
        self.env.cr.execute('SELECT id FROM pos_session WHERE id = %s FOR UPDATE', [self.id])
        self.invalidate_recordset()
        floor = self.env['restaurant.floor'].browse(floor_id).exists()
        if self.state != 'opened' or not floor or self.config_id not in floor.pos_config_ids:
            raise UserError(_('La asignación necesita una caja abierta y un piso de este terminal.'))
        zone_ids = {z['id'] for z in (floor.waiter_plan or {}).get('zones', [])}
        if not isinstance(assignments, dict) or not set(assignments) <= zone_ids:
            raise UserError(_('La zona ya no existe.'))
        for ids in assignments.values():
            if not isinstance(ids, list) or any(type(i) is not int for i in ids):
                raise UserError(_('La asignación de empleados no es válida.'))
            employees = self.env['hr.employee'].sudo().browse(ids).exists()
            if len(employees) != len(set(ids)) or any(not e.active or e.company_id != self.company_id for e in employees):
                raise UserError(_('Selecciona empleados activos de este restaurante.'))
        data = dict(self.waiter_zone_assignments or {})
        data[str(floor_id)] = assignments
        self.write({'waiter_zone_assignments': data})
        return data


class Order(models.Model):
    _inherit = 'pos.order'

    @api.model
    def waiter_zone_targets(self, order_ids):
        orders = self.browse(order_ids).exists()
        orders.check_access('read')
        return {str(o.id): ((o.session_id.waiter_zone_assignments or {}).get(str(o.table_id.floor_id.id), {}).get(o.table_id.waiter_zone, [])) for o in orders}
