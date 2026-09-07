import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { FloorPlan } from '@/components/tables/FloorPlan'
import type { TableView } from '@/lib/domain/tableState'
import { messages } from '@/lib/i18n/messages'

const geo = { floorId: 1, shape: 'square' as const, color: null, width: 110, height: 110 }
const view = (id: number, state: TableView['state'], orderId: number | null = null): TableView =>
  ({ table: { id, number: id, seats: 4, x: id * 150, y: 40, ...geo }, state, total: 0, tax: 0, orderId, startedAt: null, waiter: null, callSince: null })
const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

// Falla si la mesa libre pierde el estilo "disponible" del kit, si la ocupada no sale naranja con su Order#, o si el
// nombre accesible deja de decir el estado (los E2E y el lector de pantalla dependen de él).
it('paints available and unavailable tables with the kit colors, code and state pill', () => {
  wrap(<FloorPlan views={[view(1, 'free'), view(2, 'kitchen', 9)]} selectedId={null} onSelect={() => undefined} codeFor={() => 'DI104'} />)
  expect(screen.getByRole('button', { name: 'Mesa 1: Disponible' })).toHaveClass('bg-surface')
  const busy = screen.getByRole('button', { name: 'Mesa 2: En progreso' })
  expect(busy).toHaveClass('bg-progress')
  expect(busy).toHaveTextContent('DI104')
  expect(busy).toHaveTextContent('En progreso')
})

// Falla si la mesa se pinta fuera de su posición de Odoo o si la seleccionada pierde el halo del kit.
it('places each table at its Odoo position and marks the selected one', async () => {
  const onSelect = jest.fn()
  wrap(<FloorPlan views={[view(1, 'free'), view(2, 'served', 9)]} selectedId={2} onSelect={onSelect} />)
  expect(screen.getByRole('button', { name: 'Mesa 1: Disponible' }).parentElement).toHaveStyle({ left: '150px', top: '40px', width: '110px' })
  expect(screen.getByRole('button', { name: 'Mesa 2: Servido' })).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(screen.getByRole('button', { name: 'Mesa 1: Disponible' }))
  expect(onSelect).toHaveBeenCalledWith(1)
})

// Falla si, al elegir la mesa nueva para mover un pedido, una mesa ocupada sigue pudiendo tocarse.
it('only lets available tables be picked while choosing a destination', () => {
  wrap(<FloorPlan views={[view(1, 'free'), view(2, 'occupied', 9)]} selectedId={null} onSelect={() => undefined} pickFree />)
  expect(screen.getByRole('button', { name: 'Mesa 1: Disponible' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Mesa 2: En progreso' })).toBeDisabled()
})

it('shows the kit empty state when the floor has no tables', () => {
  wrap(<FloorPlan views={[]} selectedId={null} onSelect={() => undefined} />)
  expect(screen.getByText('Este piso no tiene mesas')).toBeInTheDocument()
})
