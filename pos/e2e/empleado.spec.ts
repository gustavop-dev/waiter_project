import { expect, test } from '@playwright/test'

import { DEMO_EMPLOYEE, startShiftAs } from './helpers/odoo'

const ODOO = 'http://192.168.56.10:8069'
const NEW_PIN = '918273'

// El PIN del empleado demo vuelve a 123456 al final para que el resto de specs sigan entrando.
async function resetDemoPin(request: Parameters<Parameters<typeof test>[2]>[0]['request']) {
  await request.post(ODOO + '/web/session/authenticate', { data: { jsonrpc: '2.0', method: 'call', params: { db: 'projectapp', login: 'admin', password: 'admin' } } })
  const rpc = async (model: string, method: string, args: unknown[]) =>
    (await (await request.post(ODOO + '/web/dataset/call_kw', { data: { jsonrpc: '2.0', method: 'call', params: { model, method, args, kwargs: {} } } })).json()).result
  const [emp] = await rpc('hr.employee', 'search_read', [[['name', '=', DEMO_EMPLOYEE.name]], ['id']])
  await rpc('hr.employee', 'waiter_change_pin', [emp.id, DEMO_EMPLOYEE.pin])
}

async function loginTerminal(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill('admin')
  await page.getByLabel('Contraseña').fill('admin')
  await page.getByRole('button', { name: 'Entrar' }).click()
}

// @flow: employee-shift  @outcome: success
// El terminal entra con su correo; el mesero elige su cuenta y valida su PIN contra `waiter_check_pin`;
// en Ajustes cambia el PIN, cierra el turno (`waiter_end_shift`) y vuelve al "Inicio de empleado".
test('terminal login, employee PIN, change PIN in settings and end the shift', async ({ page, request }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inicio de terminal')
  await loginTerminal(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inicio de empleado')

  // Un PIN equivocado no entra y el servidor avisa cuántos intentos quedan.
  await page.getByRole('button', { name: 'Empleado' }).click()
  await page.getByRole('option', { name: new RegExp(DEMO_EMPLOYEE.name) }).click()
  for (const d of '000001') await page.getByRole('button', { name: d, exact: true }).click()
  await page.getByRole('button', { name: 'Iniciar turno' }).click()
  await expect(page.getByRole('alert')).toHaveText(/PIN incorrecto/)

  await startShiftAs(page)
  await page.waitForURL('**/salon')
  await page.getByRole('button', { name: /\/ Administrador/ }).click()
  const settings = page.getByRole('dialog', { name: 'Ajustes' })
  await expect(settings.getByText(DEMO_EMPLOYEE.name).first()).toBeVisible()
  await expect(settings.getByTestId('shift-clock')).toHaveText(/^\d\d:\d\d:\d\d$/)

  await settings.getByRole('tab', { name: 'Seguridad' }).click()
  await settings.getByRole('button', { name: 'Cambiar PIN' }).click()
  const pinModal = page.getByRole('dialog', { name: 'Cambiar PIN' })
  for (const d of NEW_PIN) await pinModal.getByRole('button', { name: d, exact: true }).click()
  await pinModal.getByRole('button', { name: 'Cambiar PIN' }).click()
  await expect(page.getByText('¡PIN cambiado!')).toBeVisible()
  await page.getByRole('button', { name: 'Ok' }).click()

  await settings.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.getByRole('button', { name: 'Sí, salir' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Inicio de empleado')

  // El nuevo PIN entra; luego se restaura el de la demo.
  await startShiftAs(page, DEMO_EMPLOYEE.name, NEW_PIN)
  await page.waitForURL('**/salon')
  await resetDemoPin(request)
})

// @flow: notification-center  @outcome: success
// La campana abre el centro de avisos de `waiter.notification` con sus tres pestañas y lo deja todo leído.
test('the bell opens the notification center with its tabs and marks everything as read', async ({ page }) => {
  await loginTerminal(page)
  await startShiftAs(page)
  await page.waitForURL('**/salon')
  await page.getByRole('button', { name: /^Notificaciones/ }).click()
  const popover = page.getByRole('dialog', { name: 'Notificaciones' })
  await expect(popover.getByRole('tab', { name: 'Todas' })).toHaveAttribute('aria-selected', 'true')
  await popover.getByRole('tab', { name: 'Inventario' }).click()
  await popover.getByRole('tab', { name: 'Cocina' }).click()
  await popover.getByRole('button', { name: 'Marcar todas como leídas' }).click()
  await expect(page.getByRole('button', { name: 'Notificaciones, 0 sin leer' })).toBeVisible()
})

// @flow: notification-preferences  @outcome: success
// Los seis avisos del kit son preferencias del usuario en Odoo (`res.users.waiter_notify`): sobreviven a una recarga.
test('the notification toggles are stored on the Odoo user', async ({ page }) => {
  await loginTerminal(page)
  await startShiftAs(page)
  await page.waitForURL('**/salon')
  await page.getByRole('button', { name: /\/ Administrador/ }).click()
  const settings = page.getByRole('dialog', { name: 'Ajustes' })
  await settings.getByRole('tab', { name: 'Notificaciones' }).click()
  const sound = settings.getByRole('switch', { name: 'Inventario Sonido de notificación' })
  await expect(sound).toBeVisible()
  const before = await sound.getAttribute('aria-checked')
  await sound.click()
  await page.reload()
  await page.getByRole('button', { name: /\/ Administrador/ }).click()
  await settings.getByRole('tab', { name: 'Notificaciones' }).click()
  await expect(sound).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')
  await sound.click()  // se deja como estaba para el resto de specs
})
