import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

const EXPERIENCE = 'http://192.168.56.10:8001'

// @flow: diner-call-reaches-floor  @outcome: success
test('a diner calling the waiter from the phone shows as Asistencia on the floor and as an alert in live ops', async ({ page, request }) => {
  const open = await request.post(EXPERIENCE + '/api/v1/sesiones/', { data: { restaurante: 'burger-house', sede: 'poblado', token: 'Z2XUVG' } })
  const sid = (await open.json()).sesion.id
  const call = await request.post(EXPERIENCE + '/api/v1/sesiones/' + sid + '/llamar/')
  expect((await call.json()).ok).toBe(true)
  await loginAsAdmin(page)
  await expect(page.getByRole('button', { name: /^9\b.*Asistencia/ })).toBeVisible()
  await page.getByRole('link', { name: 'Pedidos' }).click()
  await page.waitForURL('**/operacion')
  const alert = page.getByRole('article', { name: 'Mesa pide mesero' })
  await expect(alert).toContainText('Mesa 9')
  await alert.getByRole('button', { name: 'Voy yo' }).click()
  await expect(page.getByRole('article', { name: 'Mesa pide mesero' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Mesas' }).click()
  await expect(page.getByRole('button', { name: /^9\b.*Asistencia/ })).toHaveCount(0)
})
