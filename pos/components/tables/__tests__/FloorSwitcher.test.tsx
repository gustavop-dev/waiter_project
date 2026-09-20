import { fireEvent, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { FloorSwitcher } from '@/components/tables/FloorHeader'
import { messages } from '@/lib/i18n/messages'
import { useFloorStore } from '@/lib/stores/floorStore'
import type { Floor } from '@/lib/types'

const floor = (id: number, name: string): Floor => ({ id, name, tableIds: [], hasBackground: false } as unknown as Floor)
const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

// Falla si el selector vuelve a ser unas pestañas sin rótulo (se confundían con la leyenda de colores), si el piso
// activo deja de anunciarse, o si cambiar de piso no avisa.
it('labels itself as the floor picker and marks the floor you are on', () => {
  const onChange = jest.fn()
  wrap(<FloorSwitcher floors={[floor(1, 'Terraza'), floor(2, 'Salón principal')]} activeId={1} onChange={onChange} />)
  expect(screen.getByText('Piso')).toBeInTheDocument()
  const tabs = within(screen.getByRole('tablist', { name: 'Pisos' }))
  expect(tabs.getByRole('tab', { name: 'Terraza' })).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(tabs.getByRole('tab', { name: 'Salón principal' }))
  expect(onChange).toHaveBeenCalledWith(2)
})

// Falla si con muchos pisos (o en un panel angosto de pantalla partida) las pestañas desbordan en vez de plegarse.
it('folds into a labelled dropdown when the tabs would not fit', () => {
  const floors = [1, 2, 3].map((n) => floor(n, `Piso ${n}`))
  const onChange = jest.fn()
  wrap(<FloorSwitcher compact floors={floors} activeId={2} onChange={onChange} />)
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Piso.*Piso 2/ }))
  fireEvent.click(within(screen.getByRole('listbox', { name: 'Pisos' })).getByRole('option', { name: /Piso 3/ }))
  expect(onChange).toHaveBeenCalledWith(3)
})

// Falla si la pantalla partida no se recuerda en esta tablet, o si cambiar el piso de cualquiera de los dos paneles
// deja elegida una mesa que ya no está a la vista.
it('remembers the split preference and clears the chosen table when either pane changes floor', () => {
  useFloorStore.getState().setSplit(true)
  expect(localStorage.getItem('waiter.salonSplit')).toBe('1')
  useFloorStore.getState().selectTable(7)
  useFloorStore.getState().setSecondFloor(2)
  expect(useFloorStore.getState()).toMatchObject({ split: true, secondFloorId: 2, selectedTableId: null })
  useFloorStore.getState().setSplit(false)
  expect(localStorage.getItem('waiter.salonSplit')).toBe('0')
})
