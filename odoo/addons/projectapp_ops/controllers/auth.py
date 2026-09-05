"""Endpoints públicos del login propio: pedir un código y activar la cuenta (fijar contraseña).

Nunca revelan si un correo existe: la respuesta es la misma. El código vence a las 48 h y es de un solo uso.
"""
from odoo import http
from odoo.http import request


def _find_user(login):
    """Coincidencia EXACTA sobre el login normalizado. Nunca `ilike`: un `%` casaría con el primer usuario activo."""
    login = str(login or "").strip().lower()
    if len(login) < 3 or any(ch in login for ch in ("%", "_", "\\")):
        return request.env["res.users"].sudo()
    return request.env["res.users"].sudo().search([("login", "=", login), ("active", "=", True), ("share", "=", False)], limit=1)


class WaiterAuth(http.Controller):
    @http.route("/waiter/auth/request_code", type="jsonrpc", auth="none", methods=["POST"], csrf=False)
    def request_code(self, login=None, **kw):
        user = _find_user(login)
        if user:
            try:
                user.send_waiter_invite()
            except Exception:  # noqa: BLE001 — el correo puede fallar; al cliente no se le cuenta
                pass
        return {"ok": True}

    @http.route("/waiter/auth/activate", type="jsonrpc", auth="none", methods=["POST"], csrf=False)
    def activate(self, login=None, code=None, password=None, **kw):
        user = _find_user(login)
        if not user or not password or len(str(password)) < 8 or not user.waiter_check_code(code):
            return {"ok": False, "error": "invalid"}
        user.sudo().write({"password": str(password), "waiter_activated": True, "waiter_invite_code": False, "waiter_invite_expires": False})
        return {"ok": True}
