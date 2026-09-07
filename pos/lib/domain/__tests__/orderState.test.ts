import {
  canCharge, cartTotals, countByStatus, customerName, filterHistory, greetingFor, lineGroup, matchesOrderSearch, orderNumber,
  orderStatus, orderTypeOf, progressPercent, sortOrders, type KitCourse, type KitLine, type KitOrder,
} from '@/lib/domain/orderState'

const course = (id: number, patch: Partial<KitCourse> = {}): KitCourse => ({ id, fired: true, readyAt: null, servedAt: null, ...patch })
const line = (id: number, courseId: number | null): KitLine => ({ id, uuid: `u${id}`, productId: 3, name: 'Angus', qty: 1, unitPrice: 36900, subtotal: 36900, total: 43911, note: '', courseId })
const order = (patch: Partial<KitOrder> = {}): KitOrder => ({
  id: 7, number: 'DI007', type: 'dine_in', state: 'draft', tableId: 4, tableNumber: 3, customer: 'Eva', startedAt: '2026-09-06 20:00:00', total: 0, tax: 0, lines: [], courses: [], ...patch,
})

// Falla si el tipo no sale del preset de Odoo o si un pedido viejo sin preset y con mesa deja de ser "en mesa".
it('derives the order type from the preset and falls back to the table', () => {
  expect(orderTypeOf('table', true)).toBe('dine_in')
  expect(orderTypeOf('counter', false)).toBe('takeout')
  expect(orderTypeOf('delivery', false)).toBe('delivery')
  expect(orderTypeOf(null, true)).toBe('dine_in')
  expect(orderTypeOf(null, false)).toBe('takeout')
})

// Falla si el número pierde el prefijo del kit (DI/TA/DE) o las tres cifras.
it('builds DI001-style numbers and picks the customer name', () => {
  expect(orderNumber('dine_in', '7')).toBe('DI007')
  expect(orderNumber('takeout', 112)).toBe('TA112')
  expect(orderNumber('delivery', 'x')).toBe('DE000')
  expect(customerName('Eva', [5, 'Cliente Odoo'])).toBe('Eva')
  expect(customerName(false, [5, 'Cliente Odoo'])).toBe('Cliente Odoo')
  expect(customerName('  ', false)).toBe('')
})

// Falla si una línea sin curso no queda "esperando cocina" o si el % no es servidas / enviadas.
it('groups lines by kitchen state and computes the progress percent', () => {
  const o = order({ courses: [course(1, { servedAt: 'x' }), course(2), course(3, { fired: false })], lines: [line(1, 1), line(2, 2), line(3, 3), line(4, null)] })
  expect(lineGroup(o, o.lines[0])).toBe('served')
  expect(lineGroup(o, o.lines[1])).toBe('in_progress')
  expect(lineGroup(o, o.lines[2])).toBe('waiting')
  expect(lineGroup(o, o.lines[3])).toBe('waiting')
  expect(progressPercent(o)).toBe(50)
  expect(progressPercent(order({ lines: [line(1, null)] }))).toBe(0)
})

// Falla si "esperando pago" no gana a lo demás, si un pedido pagado no es "completado" o si listo/servido se confunden.
it('derives the kit status from courses, state and the billing flag', () => {
  expect(orderStatus(order({ state: 'paid' }), true)).toBe('completed')
  expect(orderStatus(order({ courses: [course(1, { servedAt: 'x' })], lines: [line(1, 1)] }), true)).toBe('waiting_payment')
  expect(orderStatus(order({ courses: [course(1, { servedAt: 'x' })], lines: [line(1, 1)] }), false)).toBe('served')
  expect(orderStatus(order({ courses: [course(1, { readyAt: 'x' })], lines: [line(1, 1)] }), false)).toBe('ready')
  expect(orderStatus(order({ courses: [course(1, { readyAt: 'x' }), course(2)], lines: [line(1, 1), line(2, 2)] }), false)).toBe('in_progress')
  expect(orderStatus(order({ lines: [line(1, null)] }), false)).toBe('in_progress')
})

// Falla si "Cobrar" se habilita con líneas sin servir o con un pedido vacío.
it('allows charging only when every line is served', () => {
  expect(canCharge(order({ courses: [course(1, { servedAt: 'x' })], lines: [line(1, 1)] }))).toBe(true)
  expect(canCharge(order({ courses: [course(1, { servedAt: 'x' })], lines: [line(1, 1), line(2, null)] }))).toBe(false)
  expect(canCharge(order())).toBe(false)
})

// Falla si el buscador ignora el número con almohadilla o el nombre del cliente, o si los conteos por chip no cuadran.
it('searches by number or customer and counts orders per status chip', () => {
  const served = order({ id: 2, number: 'TA002', customer: 'Noa', courses: [course(1, { servedAt: 'x' })], lines: [line(1, 1)] })
  expect(matchesOrderSearch(served, '#002')).toBe(true)
  expect(matchesOrderSearch(served, 'noa')).toBe(true)
  expect(matchesOrderSearch(served, 'eva')).toBe(false)
  const counts = countByStatus([order(), served], (o) => orderStatus(o, false))
  expect(counts).toEqual({ all: 2, in_progress: 1, ready: 0, served: 1, waiting_payment: 0, completed: 0 })
})

// Falla si "más reciente" no pone primero el último pedido o si ordenar por tipo mezcla en mesa con para llevar.
it('sorts by latest, oldest and type; filters history by type', () => {
  const a = order({ id: 1, type: 'takeout', startedAt: '2026-09-06 20:00:00' })
  const b = order({ id: 2, type: 'dine_in', startedAt: '2026-09-06 21:00:00' })
  const c = order({ id: 3, type: 'delivery', startedAt: '2026-09-06 19:00:00' })
  expect(sortOrders([a, b, c], 'latest').map((o) => o.id)).toEqual([2, 1, 3])
  expect(sortOrders([a, b, c], 'oldest').map((o) => o.id)).toEqual([3, 1, 2])
  expect(sortOrders([a, b, c], 'type').map((o) => o.id)).toEqual([2, 1, 3])
  expect(filterHistory([a, b, c], 'takeout').map((o) => o.id)).toEqual([1])
})

// Falla si el IVA del 19 % no incluido se suma mal o si un impuesto incluido en el precio se cobra dos veces.
it('computes cart totals with real Odoo tax rates and greets by hour', () => {
  const taxes = [{ id: 55, amount: 19, priceInclude: false }, { id: 9, amount: 19, priceInclude: true }]
  expect(cartTotals([{ unitPrice: 36900, qty: 2, taxIds: [55] }], taxes)).toEqual({ subtotal: 73800, tax: 14022, total: 87822 })
  expect(cartTotals([{ unitPrice: 11900, qty: 1, taxIds: [9] }], taxes)).toEqual({ subtotal: 10000, tax: 1900, total: 11900 })
  expect(greetingFor(9)).toBe('morning')
  expect(greetingFor(15)).toBe('afternoon')
  expect(greetingFor(21)).toBe('evening')
})
