import { addProduct, createDraft, removeLine, setQty, subtotal, toSyncPayload } from '@/lib/domain/order'
import type { Product } from '@/lib/types'

const angus: Product = { id: 3, templateId: 2, name: 'Hamburguesa Angus', price: 36900, categoryIds: [1], taxIds: [5], favorite: false, storable: false, soldOut: false }
const draft = () => createDraft({ sessionId: 1, tableId: 6, guests: 2 })

// Falla si agregar el mismo producto dos veces crea dos líneas en vez de subir la cantidad.
it('adding the same product twice increments the existing line', () => {
  const o = addProduct(addProduct(draft(), angus), angus)
  expect(o.lines).toHaveLength(1)
  expect(o.lines[0].qty).toBe(2)
})

// Falla si el subtotal deja de multiplicar cantidad por precio unitario.
it('subtotal sums qty times unit price across lines', () => {
  expect(subtotal(draft())).toBe(0)
  const o = addProduct(draft(), angus)
  expect(subtotal(setQty(o, o.lines[0].uuid, 3))).toBe(110700)
})

// Falla si bajar la cantidad a cero deja una línea fantasma que Odoo rechaza.
it('setting qty to zero removes the line', () => {
  const o = addProduct(draft(), angus)
  expect(setQty(o, o.lines[0].uuid, 0).lines).toHaveLength(0)
})

// Falla si el payload deja de llevar uuid estable, session_id, table_id o el comando (0,0,{...}) por línea.
it('builds the sync_from_ui payload Odoo expects', () => {
  const o = addProduct(draft(), angus)
  const p = toSyncPayload(o)
  expect(p.uuid).toBe(o.uuid)
  expect(p).toMatchObject({ id: -1, session_id: 1, table_id: 6, customer_count: 2, state: 'draft' })
  expect(p.lines[0]).toEqual([0, 0, expect.objectContaining({ product_id: 3, qty: 1, price_unit: 36900, tax_ids: [[6, 0, [5]]], uuid: o.lines[0].uuid })])
})

// Falla si removeLine borra una línea distinta a la pedida.
it('removeLine drops only the targeted line', () => {
  const other: Product = { ...angus, id: 4, name: 'Papas' }
  const o = addProduct(addProduct(draft(), angus), other)
  expect(removeLine(o, o.lines[0].uuid).lines.map((l) => l.productId)).toEqual([4])
})
