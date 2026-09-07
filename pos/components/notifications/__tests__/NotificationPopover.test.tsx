import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { TopBar } from '@/components/kit/TopBar'
import { messages } from '@/lib/i18n/messages'
import { listLowStock, listReadyDishes, NoSupplierError, requestIngredients } from '@/lib/services/notifications'
import { useAuthStore } from '@/lib/stores/authStore'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { useToastStore } from '@/lib/stores/toastStore'

jest.mock('@/lib/services/notifications', () => ({ listLowStock: jest.fn(), listReadyDishes: jest.fn(), requestIngredients: jest.fn(), NoSupplierError: class extends Error {} }))
jest.mock('@/lib/services/employees', () => ({}))
jest.mock('@/lib/services/session', () => ({}))
jest.mock('@/lib/services/cashRegister', () => ({}))

const wrap = () => render(<NextIntlClientProvider locale="es" messages={messages}><TopBar active="dashboard" role="waiter" userName="Ana" onOpenSettings={() => undefined} /></NextIntlClientProvider>)
beforeEach(() => {
  localStorage.clear()
  useNotificationStore.setState({ items: [], read: new Set() })
  useAuthStore.setState({ session: { id: 16, configId: 1, state: 'opened' } })
  ;(listLowStock as jest.Mock).mockResolvedValue([{ productId: 7, name: 'Salmón', qtyOnHand: 1, minQty: 5, requested: false, at: '2026-09-06 10:00:00' }])
  ;(listReadyDishes as jest.Mock).mockResolvedValue([{ courseId: 3, dish: 'Pollo', table: 'A8', at: '2026-09-06 11:00:00' }])
})

// Falla si la campana pierde el punto de no leídas, el popover sus pestañas, o "Marcar todas como leídas" no lo apaga.
it('bell shows unread count, the popover filters by tab and marks all as read', async () => {
  wrap()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Notificaciones, 2 sin leer' })).toBeInTheDocument())
  await userEvent.click(screen.getByRole('button', { name: /Notificaciones/ }))
  const popover = screen.getByRole('dialog', { name: 'Notificaciones' })
  expect(popover).toHaveTextContent('¡Stock bajo!')
  expect(popover).toHaveTextContent('¡Plato listo para servir!')
  await userEvent.click(screen.getByRole('tab', { name: 'Cocina' }))
  expect(popover).not.toHaveTextContent('¡Stock bajo!')
  expect(popover).toHaveTextContent('A8')
  await userEvent.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }))
  expect(screen.getByRole('button', { name: 'Notificaciones, 0 sin leer' })).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('waiter.notifications.read') ?? '[]')).toEqual(expect.arrayContaining(['stock:7', 'dish:3']))
})

// Falla si "Solicitar ingredientes" no crea la compra y pasa a "Ya solicitado", o si sin proveedor no avisa.
it('request ingredients creates the purchase and flips to already requested; no supplier warns', async () => {
  ;(requestIngredients as jest.Mock).mockResolvedValueOnce(77)
  wrap()
  await userEvent.click(await screen.findByRole('button', { name: 'Notificaciones, 2 sin leer' }))
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar ingredientes' }))
  expect(await screen.findByText('Ya solicitado')).toBeInTheDocument()
  expect(useToastStore.getState().toasts[0].title).toBe('¡Solicitud enviada!')
  act(() => useNotificationStore.setState({ items: [{ id: 'stock:8', kind: 'inventory', at: '', stock: { productId: 8, name: 'Arroz', qtyOnHand: 0, minQty: 2, requested: false, at: '' } }] }))
  ;(requestIngredients as jest.Mock).mockRejectedValueOnce(new NoSupplierError())
  await userEvent.click(await screen.findByRole('button', { name: 'Solicitar ingredientes' }))
  await waitFor(() => expect(useToastStore.getState().toasts.at(-1)?.title).toMatch(/Arroz no tiene proveedor/))
})
