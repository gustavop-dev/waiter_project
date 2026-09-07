import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { FloorInfoChip, FloorSwitcher, SelectedTableBar } from '@/components/tables/FloorHeader'
import { messages } from '@/lib/i18n/messages'

const floor = (id: number, name: string) => ({ id, name, tableIds: [], hasBackground: false })
const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

// Falla si con tres pisos o menos dejan de verse como pestañas, o si el sufijo "· Exterior" se cuela en la pestaña.
it('shows up to three floors as tabs without the type suffix', async () => {
  const onChange = jest.fn()
  wrap(<FloorSwitcher floors={[floor(1, 'Terraza'), floor(2, 'Piso 2 · Exterior')]} activeId={1} onChange={onChange} />)
  expect(screen.getByRole('tab', { name: 'Terraza' })).toHaveAttribute('aria-selected', 'true')
  await userEvent.click(screen.getByRole('tab', { name: 'Piso 2' }))
  expect(onChange).toHaveBeenCalledWith(2)
})

// Falla si con cuatro pisos o más no aparece el desplegable del kit (If Floor 4+.png).
it('switches to a dropdown with four or more floors', async () => {
  const onChange = jest.fn()
  wrap(<FloorSwitcher floors={[floor(1, 'Piso 1'), floor(2, 'Piso 2'), floor(3, 'Piso 3'), floor(4, 'Piso 4')]} activeId={1} onChange={onChange} />)
  expect(screen.queryByRole('tab')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: /Piso 1/ }))
  await userEvent.click(screen.getByRole('option', { name: /Piso 4/ }))
  expect(onChange).toHaveBeenCalledWith(4)
})

// Falla si la barra pierde alguna de sus tres acciones o el nombre de la mesa.
it('selected bar carries the table name, clear, reservation and detail actions', async () => {
  const onDetail = jest.fn(), onClear = jest.fn()
  wrap(<SelectedTableBar name="11" onClear={onClear} onReservations={() => undefined} onDetail={onDetail} />)
  expect(screen.getByRole('toolbar')).toHaveTextContent('Mesa seleccionada:Mesa 11')
  await userEvent.click(screen.getByRole('button', { name: 'Detalle de mesa' }))
  await userEvent.click(screen.getByRole('button', { name: 'Quitar selección' }))
  expect([onDetail.mock.calls.length, onClear.mock.calls.length]).toEqual([1, 1])
})

// Falla si el chip del piso no muestra el tipo o esconde las mesas libres al abrirse.
it('floor chip shows the type and reveals remaining tables on tap', async () => {
  wrap(<FloorInfoChip type="outdoor" remaining={{ large: 2, small: 7 }} />)
  expect(screen.getByRole('button', { name: 'Ver detalle del piso' })).toHaveTextContent('Tipo Exterior')
  await userEvent.click(screen.getByRole('button', { name: 'Ver detalle del piso' }))
  expect(screen.getByText('Mesas pequeñas libres').nextElementSibling).toHaveTextContent('7')
})
