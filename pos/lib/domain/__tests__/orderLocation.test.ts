import { orderLocation, matchesLocation, locationZoneKey } from '@/lib/domain/orderLocation'
import type { FloorDocument } from '@/lib/domain/floorPlan'
import type { Catalog, Table } from '@/lib/types'

const table = (id: number, floorId: number): Table => ({ id, floorId, number: 1, seats: 4, x: 0, y: 0, width: 100, height: 100, shape: 'square', color: null })
const catalog: Pick<Catalog, 'tables' | 'floors'> = {
  tables: [table(10, 1), table(20, 2)],
  floors: [{ id: 1, name: 'Salón', tableIds: [10], hasBackground: false }, { id: 2, name: 'Terraza · Exterior', tableIds: [20], hasBackground: false }],
}
const plan: FloorDocument = {
  id: 2, name: 'Terraza · Exterior', revision: 1, walls: [],
  tables: [{ id: 20, key: '20', number: 1, seats: 4, x: 0, y: 0, width: 100, height: 100, zone: 'ventanas' }],
  zones: [{ id: 'ventanas', name: 'Ventanas', x: 0, y: 0, width: 300, height: 300, color: '#447DFC' }],
}

it('distinguishes tables with the same number using their floor and saved zone', () => {
  expect(orderLocation(20, catalog, plan)).toEqual({ floorId: 2, zoneId: 'ventanas', floor: 'Terraza', zone: 'Ventanas', zoneStatus: 'ready' })
  expect(orderLocation(10, catalog, plan)).toEqual({ floorId: 1, zoneId: null, floor: 'Salón', zone: null, zoneStatus: 'unavailable' })
})

it('distinguishes an unassigned zone from loading or a failed read', () => {
  expect(orderLocation(20, catalog, undefined).zoneStatus).toBe('loading')
  expect(orderLocation(20, catalog, null).zoneStatus).toBe('unavailable')
  expect(orderLocation(20, catalog, { ...plan, tables: [{ ...plan.tables[0], zone: '' }] }).zoneStatus).toBe('unassigned')
  expect(orderLocation(20, catalog, { ...plan, zones: [] }).zoneStatus).toBe('unavailable')
  expect(orderLocation(999, catalog, plan)).toEqual({ floorId: null, zoneId: null, floor: null, zone: null, zoneStatus: 'unavailable' })
})

it('filters by floor and zone ids without mixing repeated table numbers or zone names', () => {
  const terrace = orderLocation(20, catalog, plan)
  const indoor = { ...terrace, floorId: 1, floor: 'Salón' }
  expect(matchesLocation(20, terrace, '2', 'all')).toBe(true)
  expect(matchesLocation(10, indoor, '2', 'all')).toBe(false)
  expect(matchesLocation(20, terrace, 'all', locationZoneKey(terrace))).toBe(true)
  expect(matchesLocation(10, indoor, 'all', locationZoneKey(terrace))).toBe(false)
})

it('distinguishes orders without tables, unassigned zones and unavailable locations', () => {
  const unknown = orderLocation(20, catalog, null)
  const unassigned = orderLocation(20, catalog, { ...plan, tables: [{ ...plan.tables[0], zone: '' }] })
  expect(matchesLocation(null, undefined, 'no_table', 'all')).toBe(true)
  expect(matchesLocation(null, undefined, '2', 'all')).toBe(false)
  expect(matchesLocation(20, unassigned, '2', 'unassigned')).toBe(true)
  expect(matchesLocation(20, unknown, '2', 'unassigned')).toBe(false)
  expect(matchesLocation(20, unknown, '2', 'unavailable')).toBe(true)
  expect(matchesLocation(20, orderLocation(20, catalog, undefined), '2', 'unassigned')).toBe(false)
})
