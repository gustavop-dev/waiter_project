import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

const ODOO = 'http://192.168.56.10:8069'
const EXPERIENCE = 'http://192.168.56.10:8001'
type Request = Parameters<Parameters<typeof test>[2]>[0]['request']
interface Settings { plantilla?: string; paleta?: Record<string, string>; tipografia?: { display?: string } }

// Los ajustes se restauran por la pasarela del addon (no por la UI) para que el finally no dependa de la pantalla.
async function menuGateway(request: Request) {
  await request.post(ODOO + '/web/session/authenticate', { data: { jsonrpc: '2.0', method: 'call', params: { db: 'projectapp', login: 'admin', password: 'admin' } } })
  return async (params: Record<string, unknown>) =>
    (await (await request.post(ODOO + '/waiter/admin/menu_settings', { data: { jsonrpc: '2.0', method: 'call', params } })).json()).result
}

// @flow: menu-template-reach-diner  @outcome: success
test('the admin picks a menu template and the diner entry resolves it', async ({ page, request }) => {
  const gateway = await menuGateway(request)
  const before: Settings | undefined = (await gateway({ action: 'get' }))?.ajustes
  try {
    await loginAsAdmin(page)
    await page.goto('/configuracion')
    await page.getByRole('button', { name: 'Plantilla del menú', exact: true }).click()
    await page.getByRole('tab', { name: /Alta cocina/ }).click()
    await page.getByRole('button', { name: /Carta editorial/ }).click()
    await expect(page.getByRole('button', { name: /Carta editorial/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Hex · Color de acción')).toHaveValue('#1A1815')
    await expect(page.getByTitle('Vista previa del menú')).toHaveAttribute('src', /\/burger-house\/poblado\/\?vista_previa=/)
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('status')).toHaveText(/Guardado/)
    // experience invalida su caché al guardar; el poll cubre el reenvío Odoo → experience.
    await expect.poll(async () => {
      const body = await (await request.get(EXPERIENCE + '/api/v1/burger-house/poblado/')).json()
      return body.contexto.plantilla.codigo
    }, { timeout: 20_000, intervals: [1_000] }).toBe('A1')
  } finally {
    // Vuelve a lo que había (B1, la plantilla por defecto, si la sede no había elegido).
    await gateway({ action: 'set', plantilla: before?.plantilla || 'B1', paleta: before?.paleta ?? {}, tipografia: before?.tipografia ?? {} })
  }
})
