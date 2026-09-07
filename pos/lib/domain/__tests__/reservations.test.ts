import { cardPlacement, emptyDraft, hourLabel, infoStepReady, isoDate, monthGrid, type Slot } from '@/lib/domain/reservations'

const slots: Slot[] = [10, 10.5, 11, 11.5, 12].map((time) => ({ time, label: hourLabel(time), past: false }))

// Falla si la hora decimal deja de leerse como el reloj del kit.
it('formats decimal hours like the kit clock', () => {
  expect([hourLabel(10), hourLabel(10.5), hourLabel(9.25)]).toEqual(['10:00', '10:30', '09:15'])
})

// Falla si una tarjeta se coloca en la columna equivocada o pierde el ancho de su duración.
it('places a card by start time and sizes it by duration', () => {
  expect(cardPlacement({ timeStart: 10.5, timeEnd: 11.5 }, slots)).toEqual({ index: 1, span: 2 })
  expect(cardPlacement({ timeStart: 10, timeEnd: 10.5 }, slots)).toEqual({ index: 0, span: 1 })
})

// Falla si una reserva fuera del horario se cuela en la grilla o si su ancho se sale del día.
it('drops cards outside the day and clamps the span to the last slot', () => {
  expect(cardPlacement({ timeStart: 9, timeEnd: 10 }, slots)).toBeNull()
  expect(cardPlacement({ timeStart: 11.5, timeEnd: 15 }, slots)).toEqual({ index: 3, span: 2 })
})

// Falla si el paso 1 deja continuar sin nombre, sin cuándo, o con un correo inventado.
it('requires a name, a moment and a plausible email', () => {
  const base = { ...emptyDraft(), customerName: 'Nadia', date: '2026-09-08', timeStart: 15 }
  expect(infoStepReady(base)).toBe(true)
  expect(infoStepReady({ ...base, customerName: '  ' })).toBe(false)
  expect(infoStepReady({ ...base, timeStart: null })).toBe(false)
  expect(infoStepReady({ ...base, customerEmail: 'nadia@' })).toBe(false)
  expect(infoStepReady({ ...base, customerEmail: 'nadia@correo.com' })).toBe(true)
})

// Falla si el calendario no alinea el mes a lunes: septiembre de 2026 empieza en martes.
it('builds a month grid aligned to Monday', () => {
  const grid = monthGrid(2026, 8)
  expect(grid.slice(0, 3)).toEqual([null, 1, 2])
  expect(grid.filter((d) => d !== null)).toHaveLength(30)
  expect(isoDate(2026, 8, 7)).toBe('2026-09-07')
})
