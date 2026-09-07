import type { OptionChoice, OptionGroup, TaxRate } from '@/lib/domain/orderWizard'
import { callKw } from '@/lib/services/odoo'

// Adiciones del modal "Add Order": atributos de producto con price_extra (grupo obligatorio de una opción) y combos
// de Odoo (product.combo, opcionales y múltiples). También la descripción de venta y los impuestos reales.
interface RawTemplate { id: number; description_sale: string | false; combo_ids: number[]; attribute_line_ids: number[] }
interface RawLine { id: number; product_tmpl_id: [number, string]; attribute_id: [number, string] }
interface RawValue { id: number; name: string; price_extra: number; attribute_line_id: [number, string] }
interface RawCombo { id: number; name: string }
interface RawComboItem { id: number; combo_id: [number, string]; product_id: [number, string]; extra_price: number }
interface RawVariant { id: number; taxes_id: number[] }
interface RawTax { id: number; name: string; amount: number; amount_type: TaxRate['amountType']; price_include: boolean }

export interface MenuExtras { options: Map<number, OptionGroup[]>; descriptions: Map<number, string> }

export async function loadMenuExtras(templateIds: number[]): Promise<MenuExtras> {
  const options = new Map<number, OptionGroup[]>()
  const descriptions = new Map<number, string>()
  if (templateIds.length === 0) return { options, descriptions }
  const templates = await callKw<RawTemplate[]>('product.template', 'read', [templateIds, ['description_sale', 'combo_ids', 'attribute_line_ids']])
  templates.forEach((t) => { if (t.description_sale) descriptions.set(t.id, t.description_sale) })
  const push = (templateId: number, group: OptionGroup) => options.set(templateId, [...(options.get(templateId) ?? []), group])

  const lineIds = templates.flatMap((t) => t.attribute_line_ids)
  if (lineIds.length > 0) {
    const [lines, values] = await Promise.all([
      callKw<RawLine[]>('product.template.attribute.line', 'read', [lineIds, ['product_tmpl_id', 'attribute_id']]),
      callKw<RawValue[]>('product.template.attribute.value', 'search_read', [[['attribute_line_id', 'in', lineIds], ['ptav_active', '=', true]], ['name', 'price_extra', 'attribute_line_id']]),
    ])
    for (const line of lines) {
      const choices: OptionChoice[] = values.filter((v) => v.attribute_line_id[0] === line.id)
        .map((v) => ({ id: v.id, name: v.name, priceExtra: v.price_extra, kind: 'attribute', groupId: line.id, productId: null, taxIds: [] }))
      if (choices.length > 0) push(line.product_tmpl_id[0], { id: line.id, name: line.attribute_id[1], kind: 'attribute', required: true, multiple: false, choices })
    }
  }

  const comboIds = [...new Set(templates.flatMap((t) => t.combo_ids))]
  if (comboIds.length > 0) {
    const [combos, items] = await Promise.all([
      callKw<RawCombo[]>('product.combo', 'read', [comboIds, ['name']]),
      callKw<RawComboItem[]>('product.combo.item', 'search_read', [[['combo_id', 'in', comboIds]], ['combo_id', 'product_id', 'extra_price']]),
    ])
    const variants = items.length ? await callKw<RawVariant[]>('product.product', 'read', [[...new Set(items.map((i) => i.product_id[0]))], ['taxes_id']]) : []
    for (const t of templates) for (const comboId of t.combo_ids) {
      const combo = combos.find((c) => c.id === comboId)
      const choices: OptionChoice[] = items.filter((i) => i.combo_id[0] === comboId).map((i) => ({
        id: i.id, name: i.product_id[1], priceExtra: i.extra_price, kind: 'combo', groupId: comboId, productId: i.product_id[0],
        taxIds: variants.find((v) => v.id === i.product_id[0])?.taxes_id ?? [],
      }))
      if (combo && choices.length > 0) push(t.id, { id: comboId, name: combo.name, kind: 'combo', required: false, multiple: true, choices })
    }
  }
  return { options, descriptions }
}

// Tasas reales de account.tax para calcular el carrito antes de que Odoo lo recalcule al guardar.
export async function loadTaxes(ids: number[]): Promise<TaxRate[]> {
  if (ids.length === 0) return []
  const rows = await callKw<RawTax[]>('account.tax', 'read', [ids, ['name', 'amount', 'amount_type', 'price_include']])
  return rows.map((r) => ({ id: r.id, name: r.name, amount: r.amount, amountType: r.amount_type, priceInclude: Boolean(r.price_include) }))
}
