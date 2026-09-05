import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

const ODOO = 'http://192.168.56.10:8069'
const EXPERIENCE = 'http://192.168.56.10:8001'
const FIELDS = ['brand_color', 'brand_tagline', 'brand_waiter_name'] as const
type Request = Parameters<Parameters<typeof test>[2]>[0]['request']

// La marca se restaura por la API de Odoo (no por la UI) para que el finally no dependa de la pantalla.
async function odooRpc(request: Request) {
  await request.post(ODOO + '/web/session/authenticate', { data: { jsonrpc: '2.0', method: 'call', params: { db: 'projectapp', login: 'admin', password: 'admin' } } })
  return async (model: string, method: string, args: unknown[], kwargs = {}) =>
    (await (await request.post(ODOO + '/web/dataset/call_kw', { data: { jsonrpc: '2.0', method: 'call', params: { model, method, args, kwargs } } })).json()).result
}

// @flow: brand-settings-reach-diner  @outcome: success
test('the admin changes the brand and the diner API shows it within a minute', async ({ page, request }) => {
  const rpc = await odooRpc(request)
  const [company] = await rpc('res.company', 'search_read', [[], [...FIELDS]], { limit: 1 })
  try {
    await loginAsAdmin(page)
    await page.goto('/configuracion')
    await page.getByRole('button', { name: 'Marca', exact: true }).click()
    await page.getByLabel('Código hex').fill('#7A2E2A')
    await expect(page.getByText(/Contraste 9\.33:1/)).toBeVisible()
    await page.getByLabel(/^Lema/).fill('Cocina de barrio E2E')
    await page.getByLabel(/Nombre del mesero/).fill('Alex')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('status')).toHaveText(/Guardado/)
    // La caché de marca del bloque 3 es corta (BRAND_CACHE_SECONDS, 60 s por defecto y menos en dev).
    await expect.poll(async () => {
      const body = await (await request.get(EXPERIENCE + '/api/v1/burger-house/poblado/')).json()
      return { color: body.contexto.marca.color, mesero: body.contexto.marca.mesero, lema: body.contexto.marca.lema }
    }, { timeout: 20_000, intervals: [1_000] }).toEqual({ color: '#7A2E2A', mesero: 'Alex', lema: 'Cocina de barrio E2E' })
  } finally {
    // Vuelve a lo que había (normalmente vacío: se usa lo del registro); un False de Odoo se reescribe como False.
    await rpc('res.company', 'write', [[company.id], Object.fromEntries(FIELDS.map((f) => [f, company[f] || false]))])
  }
})
