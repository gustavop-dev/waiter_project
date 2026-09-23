"""Aplicar desde odoo shell en la empresa colombiana activa; operación idempotente.

En Colombia el precio que ve el cliente YA lleva el impuesto dentro: la carta dice 32.000 y el cliente paga
32.000, de los cuales 5.109 son IVA. Odoo trae por defecto el modelo contrario —el de Estados Unidos, que
suma el impuesto al final—, así que una hamburguesa de 32.000 se cobraba 38.080 y la carta mentía.

Esto cambia el valor por defecto de la empresa y retira las excepciones de venta que digan lo contrario.
No toca precios de productos, ni ventas ya cobradas, ni asientos publicados: solo afecta a las ventas nuevas.

    docker compose -p odoo-spike -f odoo/compose/docker-compose.yml exec odoo \
      odoo shell -d projectapp --no-http < odoo/provisioning/configure-taxes-colombia.py
"""
company = env.company
if company.country_id.code != 'CO':
    raise ValueError('La empresa activa debe estar en Colombia.')

# El valor por defecto de la empresa (`account_price_include`) NO se toca: Odoo lo bloquea en cuanto la
# empresa ha facturado, porque reinterpretaría lo ya emitido. La excepción por impuesto hace lo mismo para
# las ventas nuevas y deja intacto el histórico.
taxes = env['account.tax'].search([
    ('company_id', '=', company.id),
    ('type_tax_use', '=', 'sale'),
    ('amount_type', '=', 'percent'),
    ('amount', '>', 0),
])
pending = taxes.filtered(lambda t: t.price_include_override != 'tax_included')
if pending:
    pending.price_include_override = 'tax_included'
    print('Impuestos de venta que pasan a ir dentro del precio:', ', '.join(pending.mapped('name')))
else:
    print('Los impuestos de venta ya iban dentro del precio')

# Comprobación con cifras: lo cobrado por un plato de 32.000 debe ser 32.000.
sale_tax = env['account.tax'].search([
    ('company_id', '=', company.id), ('type_tax_use', '=', 'sale'), ('amount', '=', 19.0),
], limit=1)
if sale_tax:
    result = sale_tax.compute_all(32000.0, currency=company.currency_id, quantity=1.0)
    print('Plato de 32.000 → total %.0f, impuesto %.0f' % (result['total_included'], sum(t['amount'] for t in result['taxes'])))
    if round(result['total_included']) != 32000:
        raise ValueError('El impuesto sigue sumándose por fuera: revisa las excepciones del impuesto %s.' % sale_tax.name)

env.cr.commit()
