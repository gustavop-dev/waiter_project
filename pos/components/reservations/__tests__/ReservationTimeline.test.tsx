import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { ReservationTimeline, TimelineSkeleton } from '@/components/reservations/ReservationTimeline'
import { FloorSwitcher } from '@/components/tables/FloorHeader'
import { messages } from '@/lib/i18n/messages'

// El piso debe poder cambiarse también mientras carga, cuando no tiene mesas o si falla la petición.
it.each(['loading', 'empty', 'error'] as const)('keeps floor navigation available in the %s state', (state) => {
  const change = jest.fn()
  const floorSelector = <FloorSwitcher stacked floors={[{ id: 1, name: 'Interior' }, { id: 2, name: 'Terraza' }]} activeId={1} onChange={change} />
  render(<NextIntlClientProvider locale="es" messages={messages}>
    {state === 'loading' ? <TimelineSkeleton floorSelector={floorSelector} />
      : <ReservationTimeline floorSelector={floorSelector} slots={[]} tables={[]} onOpen={jest.fn()} error={state === 'error' ? 'No se pudo cargar' : null} />}
  </NextIntlClientProvider>)
  fireEvent.change(screen.getByRole('combobox', { name: 'Cambiar de piso' }), { target: { value: '2' } })
  expect(change).toHaveBeenCalledWith(2)
  if (state === 'error') expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar')
})
