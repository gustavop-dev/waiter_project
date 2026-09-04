import { countByState, deriveTableViews } from '@/lib/domain/tableState'

const tables = [{ id: 1, number: 1, floorId: 1, seats: 4 }, { id: 2, number: 2, floorId: 1, seats: 2 }, { id: 3, number: 3, floorId: 1, seats: 2 }]
const order = { id: 9, tableId: 2, total: 74200, state: 'draft' as const, lineCount: 2 }

// Falla si una mesa sin pedido abierto deja de mostrarse libre.
it('marks tables without an open order as free with zero total', () => {
  const [t1] = deriveTableViews(tables, [order], {})
  expect(t1).toEqual({ table: tables[0], state: 'free', total: 0, orderId: null })
})

// Falla si el monto del pedido abierto no llega a la celda de la mesa.
it('marks a table with an open order as occupied carrying its total', () => {
  const t2 = deriveTableViews(tables, [order], {})[1]
  expect(t2).toMatchObject({ state: 'occupied', total: 74200, orderId: 9 })
})

// Falla si "asistencia" pierde contra "en cocina": la mesa que llama al mesero debe verse siempre.
it('assist flag wins over kitchen flag on the same table', () => {
  const t2 = deriveTableViews(tables, [order], { 2: { sentToKitchen: true, assist: true } })[1]
  expect(t2.state).toBe('assist')
})

// Falla si la leyenda cuenta mal (la cuenta es lo que el gerente mira de reojo).
it('counts views by state including zero for unused states', () => {
  const counts = countByState(deriveTableViews(tables, [order], { 3: { closed: true } }))
  expect(counts).toMatchObject({ free: 1, occupied: 1, closed: 1, kitchen: 0, assist: 0 })
})
