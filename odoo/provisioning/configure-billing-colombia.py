"""Aplicar desde odoo shell en la empresa colombiana activa; operación idempotente.

Asigna el producto de propinas a la cuenta existente de ingresos para terceros.
No reescribe asientos publicados ni crea facturas.
"""
company = env.company
if company.country_id.code != 'CO':
    raise ValueError('La empresa activa debe estar en Colombia.')
account = env['account.account'].search([
    ('company_ids', 'in', company.ids), ('code', '=', '281500'),
    ('account_type', '=', 'liability_current'),
], limit=1)
if not account:
    raise ValueError('Falta la cuenta 281500 de pasivo para terceros; selecciona la cuenta equivalente en Facturación.')
configs = env['pos.config'].search([('company_id', '=', company.id), ('tip_product_id', '!=', False)])
for config in configs:
    config.waiter_set_tip_account(account.id)
    print('Propinas configuradas:', company.name, config.name, account.code)
env.cr.commit()
