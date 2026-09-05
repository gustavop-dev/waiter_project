import { barFill, barTone, countByState, deriveTableViews, elapsedMinutes, formatElapsed, matchesSearch } from '@/lib/domain/tableState'

const tables = [{ id: 1, number: 1, floorId: 1, seats: 4 }, { id: 2, number: 2, floorId: 1, seats: 2 }, { id: 3, number: 3, floorId: 1, seats: 2 }]
const order = { id: 9, tableId: 2, total: 74200, tax: 11851, state: 'draft' as const, lineCount: 2, startedAt: '2026-09-04 20:00:00', waiter: 'Alejandra', kitchen: 'none' as const }

// Falla si una mesa sin pedido abierto deja de mostrarse libre.
it('marks tables without an open order as free with zero total', () => {
  const [t1] = deriveTableViews(tables, [order], {})
  expect(t1).toEqual({ table: tables[0], state: 'free', total: 0, tax: 0, orderId: null, startedAt: null, waiter: null })
})

// Falla si el monto, el mesero o la hora de inicio del pedido no llegan a la celda de la mesa.
it('marks a table with an open order as occupied carrying total, waiter and start', () => {
  const t2 = deriveTableViews(tables, [order], {})[1]
  expect(t2).toMatchObject({ state: 'occupied', total: 74200, orderId: 9, waiter: 'Alejandra', startedAt: '2026-09-04 20:00:00' })
})

// Falla si "asistencia" pierde contra "en cocina": la mesa que llama al mesero debe verse siempre.
it('assist flag wins over the kitchen phase on the same table', () => {
  const t2 = deriveTableViews(tables, [{ ...order, kitchen: 'cooking' }], { 2: { assist: true } })[1]
  expect(t2.state).toBe('assist')
})

// Falla si el salón no pinta "en cocina" cuando Odoo tiene un curso disparado, o "servido" cuando todos se entregaron.
it('derives kitchen and served states from the order kitchen phase', () => {
  const cooking = deriveTableViews(tables, [{ ...order, kitchen: 'ready' }], {})[1]
  const served = deriveTableViews(tables, [{ ...order, kitchen: 'served' }], {})[1]
  expect([cooking.state, served.state]).toEqual(['kitchen', 'served'])
})

// Falla si la leyenda cuenta mal (la cuenta es lo que el gerente mira de reojo).
it('counts views by state including zero for unused states', () => {
  const counts = countByState(deriveTableViews(tables, [order], { 3: { closed: true } }))
  expect(counts).toMatchObject({ free: 1, occupied: 1, closed: 1, kitchen: 0, assist: 0 })
})

// Falla si date_order se interpreta en hora local: Odoo lo manda en UTC y la mesa mostraría 5 horas de más.
it('measures elapsed minutes from an Odoo UTC timestamp', () => {
  expect(elapsedMinutes('2026-09-04 20:00:00', Date.parse('2026-09-04T21:14:00Z'))).toBe(74)
  expect(formatElapsed(74)).toBe('1:14')
  expect(formatElapsed(34)).toBe('0:34')
})

// Falla si la barra cambia de tono fuera de los 12 y 18 minutos del sistema de diseño.
it('fills the 22-minute bar and changes tone at 12 and 18 minutes', () => {
  expect(barFill(11)).toBe(50)
  expect(barFill(30)).toBe(100)
  expect([barTone(5), barTone(12), barTone(18)]).toEqual(['ok', 'warn', 'late'])
})

// Falla si buscar "3" no encuentra la mesa 3, si "#9" no encuentra el pedido 9, o si el vacío filtra algo.
it('matches tables by number, order id or waiter', () => {
  const view = deriveTableViews(tables, [order], {})[1]
  expect([matchesSearch(view, '2'), matchesSearch(view, '#9'), matchesSearch(view, 'ale'), matchesSearch(view, '7'), matchesSearch(view, '')]).toEqual([true, true, true, false, true])
})
