import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

const SCREENS = [
  ['/operacion', 'Operación en vivo'], ['/automatizacion', 'Retorno de inversión'], ['/ventas', 'Ventas'], ['/catalogo', 'Catálogo'],
  ['/inventario', 'Inventario'], ['/clientes', 'Clientes'], ['/facturacion', 'Facturación'], ['/configuracion', 'Configuración'],
] as const

// @flow: backoffice-navigation  @outcome: success
test('every sidebar module opens with its title against the real Odoo', async ({ page }) => {
  await loginAsAdmin(page)
  for (const [path, title] of SCREENS) {
    await page.goto(path)
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible()
  }
  // El enlace "Configurar" de operación en vivo abre directo la sección de umbrales.
  await page.goto('/configuracion?seccion=alertas')
  await expect(page.getByRole('button', { name: 'Umbrales de alerta' })).toHaveAttribute('aria-current', 'page')
})

// @flow: catalog-edit-price  @outcome: success
test('editing a product price from the catalog reaches Odoo and comes back', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/catalogo')
  await page.getByRole('button', { name: /Papas Trufadas/ }).click()
  const price = page.getByLabel(/Precio/)
  const current = Number(await price.inputValue())
  await price.fill(String(current + 100))
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toHaveText(/Guardado/)
  await page.reload()
  await page.getByRole('button', { name: /Papas Trufadas/ }).click()
  await expect(page.getByLabel(/Precio/)).toHaveValue(String(current + 100))
  await page.getByLabel(/Precio/).fill(String(current))
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('status')).toHaveText(/Guardado/)
})
