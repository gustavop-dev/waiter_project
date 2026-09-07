import { listPaidOrders, orderLines } from '@/lib/services/invoices'
import { callKw } from '@/lib/services/odoo'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn() }))
const m = callKw as jest.Mock
beforeEach(() => m.mockClear())

// Falla si el panel de la factura pierde el impuesto o la mesa del pedido, o si un pedido sin cliente llega con nombre.
it('maps paid orders with tax, table and customer', async () => {
  m.mockResolvedValueOnce([{ id: 12, pos_reference: 'Pedido 00012', date_order: '2026-09-06 14:00:00', amount_total: 87822, amount_tax: 14022, table_id: [5, 'Mesa 5'], partner_id: false, account_move: [3, 'INV/1'] }])
  const [o] = await listPaidOrders()
  expect(o).toEqual({ id: 12, reference: 'Pedido 00012', date: '2026-09-06 14:00:00', total: 87822, tax: 14022, tableId: 5, partnerId: null, partnerName: '', invoiceId: 3 })
})

// Falla si las líneas no traen el unitario y el total con impuesto que pinta "Detalle del pedido".
it('reads the order lines with unit price and total', async () => {
  m.mockResolvedValueOnce([{ id: 1, full_product_name: 'Hamburguesa Angus', qty: 2, price_unit: 36900, price_subtotal_incl: 73800 }])
  await expect(orderLines(12)).resolves.toEqual([{ id: 1, name: 'Hamburguesa Angus', qty: 2, unit: 36900, total: 73800 }])
  expect(m.mock.calls[0][2][0]).toEqual([['order_id', '=', 12]])
})
