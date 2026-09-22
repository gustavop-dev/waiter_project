"""Bind the verified employee to the HTTP session; enforce POS actions server-side."""
from odoo import http
from odoo.http import request
from odoo.exceptions import AccessError
from odoo.addons.web.controllers.dataset import DataSet
from ..models.role_permissions import employee_role


class WaiterDataSet(DataSet):
    def _waiter_guard(self, model, method, args, kwargs):
        context = dict(kwargs.get('context') or {})
        supplied = context.pop('waiter_pos_identity', None)
        kwargs = {**kwargs, 'context': context}
        # PIN exchange and ending the employee session already verify their own credentials.
        if model == 'hr.employee' and method in ('waiter_check_pin', 'waiter_end_shift', 'waiter_forgot_pin', 'waiter_login_list'):
            return kwargs
        identity = supplied or request.session.get('waiter_pos_identity')
        if not identity:
            return kwargs
        if not isinstance(identity, dict):
            raise AccessError('Sesión de empleado inválida.')
        try:
            employee, _ = employee_role(request.env, identity.get('id'), identity.get('token'))
        except AccessError:
            request.session.pop('waiter_pos_identity', None)
            raise
        if supplied:
            request.session['waiter_pos_identity'] = {'id': employee.id, 'token': identity['token'], 'config_id': identity.get('config_id')}
        configs = request.env['pos.config']
        if model == 'pos.config' and args and isinstance(args[0], list) and all(type(value) is int for value in args[0]):
            configs = configs.browse(args[0]).exists()
        elif model == 'pos.order' and method == 'sync_from_ui':
            sessions = request.env['pos.session'].browse([row['session_id'] for row in args[0]])
            configs = sessions.config_id
        elif model == 'pos.order' and args and isinstance(args[0], list) and all(type(value) is int for value in args[0]):
            configs = request.env['pos.order'].browse(args[0]).exists().session_id.config_id
        elif model == 'pos.order.line' and args and isinstance(args[0], list) and method != 'create':
            if all(type(value) is int for value in args[0]):
                configs = request.env['pos.order.line'].browse(args[0]).exists().order_id.session_id.config_id
        if model == 'restaurant.order.course':
            if method == 'kitchen_fire' and args and type(args[0]) is int:
                configs = request.env['pos.order'].browse(args[0]).exists().session_id.config_id
            elif args and isinstance(args[0], list) and all(type(value) is int for value in args[0]):
                configs = request.env[model].browse(args[0]).exists().order_id.session_id.config_id
        if model == 'pos.payment':
            if method == 'create' and args:
                values = args[0] if isinstance(args[0], list) else [args[0]]
                configs = request.env['pos.order'].browse([value['pos_order_id'] for value in values if value.get('pos_order_id')]).exists().session_id.config_id
            elif args and isinstance(args[0], list) and all(type(value) is int for value in args[0]):
                configs = request.env[model].browse(args[0]).exists().pos_order_id.session_id.config_id
        if not configs:
            config_id = identity.get('config_id')
            configs = request.env['pos.config'].browse(config_id).exists() if type(config_id) is int else request.env['pos.config'].search([('company_id', '=', employee.company_id.id)], limit=1)
        if not configs:
            raise AccessError('No hay un punto de venta autorizado.')
        for config in configs:
            config._waiter_check_rpc(employee.id, identity['token'], model, method, args)
        return kwargs

    @http.route()
    def call_kw(self, model, method, args, kwargs, path=None):
        kwargs = self._waiter_guard(model, method, args, kwargs)
        result = super().call_kw(model, method, args, kwargs, path)
        if model == 'hr.employee' and method == 'waiter_check_pin' and result.get('ok'):
            request.session['waiter_pos_identity'] = {'id': result['employee']['id'], 'token': result['token']}
        if model == 'hr.employee' and method == 'waiter_end_shift':
            request.session.pop('waiter_pos_identity', None)
        return result

    @http.route()
    def call_button(self, model, method, args, kwargs, path=None):
        return super().call_button(model, method, args, self._waiter_guard(model, method, args, kwargs), path)
