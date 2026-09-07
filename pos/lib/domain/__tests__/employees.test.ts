import { formatElapsed, formatHour, fromOdooDatetime, pinMatches, readStoredEmployee, sha1, shiftLabel, storeEmployee, todayShift } from '@/lib/domain/employees'

// Falla si el empleado activo no se recuerda en el dispositivo o si un valor corrupto rompe la lectura.
it('remembers the active employee on the device and survives corrupt storage', () => {
  localStorage.clear()
  expect(readStoredEmployee()).toBeNull()
  storeEmployee({ id: 2, checkIn: '2026-09-06T10:00:00.000Z' })
  expect(readStoredEmployee()).toEqual({ id: 2, checkIn: '2026-09-06T10:00:00.000Z' })
  localStorage.setItem('waiter.employee', '{bad')
  expect(readStoredEmployee()).toBeNull()
  storeEmployee(null)
  expect(localStorage.getItem('waiter.employee')).toBeNull()
})

// Falla si el sha1 en cliente deja de coincidir con hashlib.sha1 de pos_hr (vectores conocidos).
it('sha1 matches the hashes pos_hr sends in load_data', () => {
  expect(sha1('123456')).toBe('7c4a8d09ca3762af61e59520943dc26494f8941b')
  expect(sha1('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
  expect(sha1('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
  expect(sha1('Sofía Ríos')).toBe(sha1('Sofía Ríos'))
})

// Falla si un PIN equivocado entra, si el PIN vacío pasa con hash, o si un empleado sin PIN no entra.
it('pinMatches compares the typed pin against the hash and lets pin-less employees in', () => {
  expect(pinMatches('123456', sha1('123456'))).toBe(true)
  expect(pinMatches('123457', sha1('123456'))).toBe(false)
  expect(pinMatches('', sha1('123456'))).toBe(false)
  expect(pinMatches('', null)).toBe(true)
})

// Falla si el turno de hoy mezcla días (Odoo cuenta desde el lunes) o no toma el rango completo.
it('todayShift spans the first and last slot of the Odoo weekday', () => {
  const slots = [{ dayofweek: '0', hour_from: 12, hour_to: 15 }, { dayofweek: '0', hour_from: 18, hour_to: 22 }, { dayofweek: '1', hour_from: 8, hour_to: 12 }]
  const monday = new Date(2026, 8, 7)
  expect(todayShift(slots, monday)).toEqual({ from: 12, to: 22 })
  expect(todayShift(slots, new Date(2026, 8, 6))).toBeNull()
  expect(shiftLabel(todayShift(slots, monday), 'Sin horario')).toBe('12:00 p. m. – 10:00 p. m.')
  expect(shiftLabel(null, 'Sin horario')).toBe('Sin horario')
})

// Falla si las horas decimales de Odoo o el cronómetro se formatean mal.
it('formats hours, elapsed time and parses Odoo UTC datetimes', () => {
  expect(formatHour(10.5)).toBe('10:30 a. m.')
  expect(formatHour(0)).toBe('12:00 a. m.')
  expect(formatElapsed(4 * 3600_000 + 25 * 60_000 + 32_000)).toBe('04:25:32')
  expect(formatElapsed(-5)).toBe('00:00:00')
  expect(fromOdooDatetime('2026-09-06 10:00:00').toISOString()).toBe('2026-09-06T10:00:00.000Z')
})
