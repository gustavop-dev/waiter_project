import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: salon-view-tables  @outcome: display
test('the floor shows the seeded tables with their state word', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page.getByRole('tab', { name: 'Terraza' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Mesa \d+: (Disponible|En progreso|Reservada)/ }).first()).toBeVisible()
  // El kit abre el detalle en un modal; el panel lateral del diseño anterior ya no existe.
  await expect(page.getByRole('button', { name: 'Crear pedido' })).toBeVisible()
})

// @flow: order-needs-a-table  @outcome: blocked
// Un pedido en mesa no puede heredar la última mesa que alguien tocó: se pide siempre, venga de donde venga,
// y aunque llegue elegida el asistente la enseña para confirmarla.
test('creating an order asks for the table first, wherever it starts', async ({ page }) => {
  await loginAsAdmin(page)
  const prompt = page.getByRole('dialog').filter({ hasText: '¿De qué mesa es el pedido?' })

  // Desde Inicio: lleva al plano y pide la mesa.
  await page.goto('/dashboard')
  await page.getByRole('link', { name: 'Crear pedido' }).click()
  await expect(page).toHaveURL(/\/salon$/)
  await expect(prompt).toBeVisible()
  await prompt.getByRole('button', { name: 'Elegir en el plano' }).click()

  // Ya en el plano, sin mesa elegida el botón vuelve a pedirla en vez de abrir el asistente.
  await page.getByRole('button', { name: 'Crear pedido' }).click()
  await expect(prompt).toBeVisible()
  await prompt.getByRole('button', { name: 'Elegir en el plano' }).click()

  // Con la mesa elegida sí abre, y el asistente la enseña marcada en su paso.
  const table = page.getByRole('button', { name: /^Mesa \d+: (Disponible|Reservada)/ }).first()
  const mesa = ((await table.getAttribute('aria-label')) ?? '').match(/^Mesa (\d+):/)?.[1] ?? ''
  await table.click()
  await page.getByRole('button', { name: 'Crear pedido' }).click()
  await expect(page).toHaveURL(/\/pedidos\/nuevo\?mesa=\d+$/)
  await page.getByLabel('Nombre del cliente').fill('Mesa obligatoria')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('Mesa seleccionada:')).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}\\b`) })).toHaveAttribute('aria-pressed', 'true')
})
