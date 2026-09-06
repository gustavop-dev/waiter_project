import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { SettingsModal } from '@/components/kit/SettingsModal'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme })

// Falla si elegir "Oscuro" en Pantalla no cambia el tema del documento.
it('display tab switches the theme', async () => {
  wrap(<SettingsModal open onClose={() => undefined} user={{ name: 'Ana', role: 'admin' }} restaurant="La Provincia" onLogout={async () => undefined} />)
  await userEvent.click(screen.getByRole('tab', { name: 'Pantalla' }))
  await userEvent.click(screen.getByRole('radio', { name: 'Oscuro' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
})

// Falla si un toggle de notificaciones no se recuerda en el dispositivo.
it('notification toggles persist locally', async () => {
  wrap(<SettingsModal open onClose={() => undefined} user={{ name: 'Ana', role: 'admin' }} restaurant="" onLogout={async () => undefined} />)
  await userEvent.click(screen.getByRole('tab', { name: 'Notificaciones' }))
  await userEvent.click(screen.getByRole('switch', { name: 'Cocina Sonido' }))
  expect(JSON.parse(localStorage.getItem('waiter.notify') ?? '{}')).toEqual({ 'kitchen.sound': false })
})

// Falla si "Cerrar sesión" sale sin confirmar o si la confirmación no llama a onLogout.
it('logout asks for confirmation before calling onLogout', async () => {
  const onLogout = jest.fn(async () => undefined)
  wrap(<SettingsModal open onClose={() => undefined} user={{ name: 'Ana', role: 'waiter' }} restaurant="" onLogout={onLogout} />)
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  expect(onLogout).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Sí, salir' }))
  expect(onLogout).toHaveBeenCalled()
})
