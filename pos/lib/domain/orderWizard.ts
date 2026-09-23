import { uuid } from '@/lib/domain/uuid'
import type { Product } from '@/lib/types'

// Wizard "Create New Order" del kit: tipo de pedido (pos.preset de Odoo), datos del cliente, mesa, carrito con
// adiciones y resumen. Reglas puras; el store y los componentes solo las llaman.
export type OrderType = 'dineIn' | 'takeAway' | 'delivery'
export const ORDER_TYPES: OrderType[] = ['dineIn', 'takeAway', 'delivery']
// Presets sembrados en Odoo 19: 1 Dine In (mesa), 2 Takeout (mostrador), 3 Delivery (domicilio).
export const PRESET_ID: Record<OrderType, number> = { dineIn: 1, takeAway: 2, delivery: 3 }
export const TYPE_PREFIX: Record<OrderType, string> = { dineIn: 'DI', takeAway: 'TA', delivery: 'DE' }

export type WizardStep = 'customer' | 'table' | 'menu' | 'summary' | 'payment'
// En mesa elige mesa y va a cocina; para llevar y domicilio cobran antes de cocina (kit: Take Away / Pay.png).
export function stepsFor(type: OrderType): WizardStep[] {
  return type === 'dineIn' ? ['customer', 'table', 'menu', 'summary'] : ['customer', 'menu', 'summary', 'payment']
}

export interface CustomerInfo { type: OrderType; people: number; babyChair: boolean; name: string; address: string; phone: string }
export const DEFAULT_INFO: CustomerInfo = { type: 'dineIn', people: 2, babyChair: false, name: '', address: '', phone: '' }

export function customerInfoValid(info: CustomerInfo): boolean {
  if (info.people < 1) return false
  if (info.type === 'delivery') return info.name.trim() !== '' && info.address.trim() !== '' && info.phone.trim() !== ''
  return true
}

// Grupos de adiciones del modal "Add Order": atributos con price_extra (obligatorio, una opción) y combos (opcional, varias).
export type OptionKind = 'attribute' | 'combo'
export interface OptionChoice { id: number; name: string; priceExtra: number; kind: OptionKind; groupId: number; productId: number | null; taxIds: number[] }
export interface OptionGroup { id: number; name: string; kind: OptionKind; required: boolean; multiple: boolean; choices: OptionChoice[] }

export function toggleChoice(groups: OptionGroup[], chosen: OptionChoice[], choice: OptionChoice): OptionChoice[] {
  const group = groups.find((g) => g.id === choice.groupId && g.kind === choice.kind)
  const already = chosen.some((c) => c.id === choice.id && c.kind === choice.kind)
  if (group?.multiple) return already ? chosen.filter((c) => !(c.id === choice.id && c.kind === choice.kind)) : [...chosen, choice]
  const rest = chosen.filter((c) => !(c.groupId === choice.groupId && c.kind === choice.kind))
  return already ? rest : [...rest, choice]
}

// "Add to Cart" solo se habilita con todos los grupos obligatorios elegidos.
export function selectionComplete(groups: OptionGroup[], chosen: OptionChoice[]): boolean {
  return groups.filter((g) => g.required).every((g) => chosen.some((c) => c.groupId === g.id && c.kind === g.kind))
}

export interface CartLine { uuid: string; productId: number; templateId: number; name: string; unitPrice: number; qty: number; note: string; taxIds: number[]; options: OptionChoice[]; hasImage: boolean }

export function newLine(product: Product, qty: number, note: string, options: OptionChoice[]): CartLine {
  return { uuid: uuid(), productId: product.id, templateId: product.templateId, name: product.name, unitPrice: product.price, qty, note, taxIds: product.taxIds, options, hasImage: product.hasImage }
}

const optionKey = (options: OptionChoice[]) => options.map((o) => `${o.kind}:${o.id}`).sort().join('|')
const sameLine = (a: CartLine, b: CartLine) => a.productId === b.productId && a.note === b.note && optionKey(a.options) === optionKey(b.options)

// Mismo plato, mismas adiciones y misma nota: se suma la cantidad; si no, es otra línea.
export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find((l) => sameLine(l, line))
  return existing ? lines.map((l) => (l === existing ? { ...l, qty: l.qty + line.qty } : l)) : [...lines, line]
}
export function setLineQty(lines: CartLine[], lineUuid: string, qty: number): CartLine[] {
  return qty <= 0 ? lines.filter((l) => l.uuid !== lineUuid) : lines.map((l) => (l.uuid === lineUuid ? { ...l, qty } : l))
}
export function replaceLine(lines: CartLine[], lineUuid: string, patch: Pick<CartLine, 'qty' | 'note' | 'options'>): CartLine[] {
  return lines.map((l) => (l.uuid === lineUuid ? { ...l, ...patch } : l))
}

export const extrasOf = (line: CartLine) => line.options.reduce((a, o) => a + o.priceExtra, 0)
export const lineUnitPrice = (line: CartLine) => line.unitPrice + extrasOf(line)
export const lineSubtotal = (line: CartLine) => lineUnitPrice(line) * line.qty
export const itemCount = (lines: CartLine[]) => lines.reduce((a, l) => a + l.qty, 0)
export const additionNames = (line: CartLine) => line.options.map((o) => o.name).join(', ')
// Nombre que Odoo guarda en full_product_name: "Hamburguesa Angus (BBQ)".
export const fullProductName = (line: CartLine) => (line.options.length ? `${line.name} (${additionNames(line)})` : line.name)

// Impuestos reales de account.tax (porcentaje o fijo, incluido o no en el precio). Sin "12 %" inventado.
export interface TaxRate { id: number; name: string; amount: number; amountType: 'percent' | 'fixed' | 'division' | 'group'; priceInclude: boolean }
export interface CartTotals { subtotal: number; tax: number; total: number; taxNames: string[] }

function lineTax(line: CartLine, taxes: TaxRate[]): { tax: number; included: number } {
  const gross = lineSubtotal(line)
  let tax = 0
  let included = 0
  for (const id of line.taxIds) {
    const rate = taxes.find((t) => t.id === id)
    if (!rate) continue
    if (rate.amountType === 'fixed') { tax += rate.amount * line.qty; continue }
    if (rate.amountType !== 'percent') continue
    if (rate.priceInclude) { const part = gross - gross / (1 + rate.amount / 100); tax += part; included += part } else tax += (gross * rate.amount) / 100
  }
  return { tax, included }
}

export function cartTotals(lines: CartLine[], taxes: TaxRate[]): CartTotals {
  let subtotal = 0
  let tax = 0
  for (const line of lines) {
    const { tax: t, included } = lineTax(line, taxes)
    subtotal += lineSubtotal(line) - included
    tax += t
  }
  const names = [...new Set(lines.flatMap((l) => l.taxIds).map((id) => taxes.find((t) => t.id === id)?.name).filter((n): n is string => Boolean(n)))]
  return { subtotal: Math.round(subtotal), tax: Math.round(tax), total: Math.round(subtotal + tax), taxNames: names }
}

// Silla de bebé y datos de domicilio viajan en general_customer_note hasta que exista el campo en projectapp_ops.
export function orderNote(info: CustomerInfo, labels: { babyChair: string; delivery: (address: string, phone: string) => string }): string {
  const parts: string[] = []
  if (info.babyChair) parts.push(labels.babyChair)
  if (info.type === 'delivery') parts.push(labels.delivery(info.address.trim(), info.phone.trim()))
  return parts.join(' ')
}

type LineCommand = [0, 0, Record<string, unknown>]
export interface KitOrderPayload {
  id: number; uuid: string; session_id: number; table_id: number | false; preset_id: number; floating_order_name: string; customer_count: number
  sequence_number: number; state: 'draft'; general_customer_note: string; amount_total: number; amount_tax: number; amount_paid: number; amount_return: number
  date_order: string; lines: LineCommand[]
}

const nowForOdoo = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

const attributeExtras = (line: CartLine) => line.options.filter((o) => o.kind === 'attribute').reduce((a, o) => a + o.priceExtra, 0)
// Las opciones de combo son líneas hijas en Odoo (combo_item_id); el uuid deriva del padre para enlazarlas al crear.
export const comboChildUuid = (parentUuid: string, itemId: number) => `${parentUuid}-c${itemId}`

// Payload de sync_from_ui: preset, nombre libre, comensales y mesa cuando aplica. Las adiciones por atributo van en
// attribute_value_ids y en price_unit (Odoo respeta ese precio al recalcular cuando los valores están enlazados).
export function toKitPayload(args: { uuid: string; sessionId: number; tableId: number | null; info: CustomerInfo; note: string; lines: CartLine[] }): KitOrderPayload {
  const { info } = args
  return {
    id: -1, uuid: args.uuid, session_id: args.sessionId, table_id: info.type === 'dineIn' && args.tableId ? args.tableId : false,
    preset_id: PRESET_ID[info.type], floating_order_name: info.name.trim(), customer_count: info.people, sequence_number: 1, state: 'draft',
    general_customer_note: args.note, amount_total: 0, amount_tax: 0, amount_paid: 0, amount_return: 0, date_order: nowForOdoo(),
    lines: args.lines.flatMap((l): LineCommand[] => [
      [0, 0, {
        id: -1, uuid: l.uuid, product_id: l.productId, qty: l.qty, price_unit: l.unitPrice + attributeExtras(l), price_extra: attributeExtras(l),
        attribute_value_ids: [[6, 0, l.options.filter((o) => o.kind === 'attribute').map((o) => o.id)]],
        tax_ids: [[6, 0, l.taxIds]], price_subtotal: 0, price_subtotal_incl: 0, full_product_name: fullProductName(l), customer_note: l.note,
      }],
      ...l.options.filter((o) => o.kind === 'combo' && o.productId !== null).map((o): LineCommand => [0, 0, {
        id: -1, uuid: comboChildUuid(l.uuid, o.id), product_id: o.productId, qty: l.qty, price_unit: o.priceExtra, price_extra: 0, combo_item_id: o.id,
        attribute_value_ids: [[6, 0, []]], tax_ids: [[6, 0, o.taxIds]], price_subtotal: 0, price_subtotal_incl: 0, full_product_name: o.name, customer_note: '',
      }]),
    ]),
  }
}

// "#DI001": prefijo por tipo + tracking_number de Odoo a tres cifras. Solo presentación hasta que el addon fije el prefijo.
export function displayReference(type: OrderType, trackingNumber: string | number): string {
  const digits = String(trackingNumber).replace(/\D/g, '') || '0'
  return `${TYPE_PREFIX[type]}${digits.padStart(3, '0')}`
}
