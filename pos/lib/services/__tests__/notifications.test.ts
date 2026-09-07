import { listLowStock, listReadyDishes, NoSupplierError, requestIngredients } from '@/lib/services/notifications'
import { callKw } from '@/lib/services/odoo'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn() }))
const rpc = callKw as jest.Mock

beforeEach(() => rpc.mockReset())

// Falla si un producto por encima del mínimo aparece como stock bajo o si "Ya solicitado" ignora las RFQ en borrador.
it('lists only orderpoints below their minimum and flags the ones with a draft purchase', async () => {
  rpc.mockResolvedValueOnce([
    { id: 1, product_id: [7, 'Salmón'], product_min_qty: 5, product_max_qty: 20, qty_on_hand: 1, write_date: '2026-09-06 10:00:00' },
    { id: 2, product_id: [8, 'Arroz'], product_min_qty: 5, product_max_qty: 20, qty_on_hand: 9, write_date: '2026-09-06 10:00:00' },
  ]).mockResolvedValueOnce([{ product_id: [7, 'Salmón'] }])
  const rows = await listLowStock()
  expect(rows).toEqual([{ productId: 7, name: 'Salmón', qtyOnHand: 1, minQty: 5, requested: true, at: '2026-09-06 10:00:00' }])
})

// Falla si un curso listo pierde sus platos o la mesa del pedido.
it('lists ready courses with their dishes and table', async () => {
  rpc.mockResolvedValueOnce([{ id: 3, order_id: [40, 'Pedido'], ready_date: '2026-09-06 11:00:00', line_ids: [5, 6] }])
    .mockResolvedValueOnce([{ id: 5, full_product_name: 'Pollo', qty: 2 }, { id: 6, full_product_name: 'Pasta', qty: 1 }])
    .mockResolvedValueOnce([{ id: 40, table_id: [2, 'A8'] }])
  expect(await listReadyDishes(16)).toEqual([{ courseId: 3, dish: '2 × Pollo, Pasta', table: 'A8', at: '2026-09-06 11:00:00' }])
})

// Falla si la solicitud crea la compra sin proveedor o con una cantidad que no repone hasta el máximo.
it('requestIngredients creates a draft purchase to the supplier or refuses without one', async () => {
  const row = { productId: 7, name: 'Salmón', qtyOnHand: 1, minQty: 5, requested: false, at: '' }
  rpc.mockResolvedValueOnce([])
  await expect(requestIngredients(row)).rejects.toBeInstanceOf(NoSupplierError)
  rpc.mockResolvedValueOnce([{ partner_id: [12, 'Pesquera'] }]).mockResolvedValueOnce([{ product_max_qty: 20 }]).mockResolvedValueOnce(77)
  expect(await requestIngredients(row)).toBe(77)
  expect(rpc).toHaveBeenLastCalledWith('purchase.order', 'create', [{ partner_id: 12, origin: 'Waiter POS', order_line: [[0, 0, { product_id: 7, product_qty: 19 }]] }])
})
