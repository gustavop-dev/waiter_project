"""Rol de Waiter en el usuario de Odoo, sincronizado con los grupos de POS.

El rol decide qué pantallas ve la app (`pos/`); los grupos deciden qué acepta la
API de Odoo. Se mantienen juntos para que nunca se contradigan.
"""
from odoo import api, fields, models

ROLES = [("waiter", "Mesero"), ("cashier", "Cajero"), ("admin", "Administrador")]
GROUPS_BY_ROLE = {
    "waiter": ["base.group_user", "point_of_sale.group_pos_user"],
    "cashier": ["base.group_user", "point_of_sale.group_pos_user", "account.group_account_invoice"],
    "admin": ["base.group_user", "point_of_sale.group_pos_manager", "product.group_product_manager", "stock.group_stock_manager",
              "account.group_account_invoice"],
}
MANAGED = sorted({g for gs in GROUPS_BY_ROLE.values() for g in gs} - {"base.group_user"})


class ResUsers(models.Model):
    _inherit = "res.users"

    waiter_role = fields.Selection(ROLES, string="Rol en Waiter", default="waiter")

    @property
    def SELF_READABLE_FIELDS(self):
        return super().SELF_READABLE_FIELDS + ["waiter_role"]

    def _group_commands_for(self, role):
        wanted = set(GROUPS_BY_ROLE.get(role, GROUPS_BY_ROLE["waiter"]))
        commands = []
        for xid in MANAGED + ["base.group_user"]:
            group = self.env.ref(xid, raise_if_not_found=False)
            if group:
                commands.append((4 if xid in wanted else 3, group.id))
        return commands

    @api.model_create_multi
    def create(self, vals_list):
        users = super().create(vals_list)
        for user in users:
            user.sudo().write({"group_ids": user._group_commands_for(user.waiter_role)})
        return users

    def write(self, vals):
        result = super().write(vals)
        if "waiter_role" in vals:
            for user in self:
                super(ResUsers, user.sudo()).write({"group_ids": user._group_commands_for(vals["waiter_role"])})
        return result
