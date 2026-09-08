import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: salon-view-tables  @outcome: display
test('the floor shows the seeded tables with their state word', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page.getByRole('tab', { name: 'Terraza' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Mesa \d+: (Disponible|En progreso|Reservada)/ }).first()).toBeVisible()
  // El kit abre el detalle en un modal; el panel lateral del diseño anterior ya no existe.
  // "Crear pedido" no está arriba: aparece en la barra de la mesa cuando hay una elegida.
  await expect(page.getByRole('button', { name: 'Crear pedido' })).toHaveCount(0)
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

  // Sin mesa elegida no hay por dónde crear: el botón vive en la barra de la mesa, que aún no existe.
  await expect(page.getByRole('button', { name: 'Crear pedido' })).toHaveCount(0)

  // Al elegirla aparece su barra abajo, y desde ahí sí: el asistente pasa del cliente al menú sin volver
  // a pedir la mesa.
  await page.getByRole('button', { name: /^Mesa \d+: (Disponible|Reservada)/ }).first().click()
  await page.getByRole('toolbar', { name: 'Mesa seleccionada:' }).getByRole('button', { name: 'Crear pedido' }).click()
  await expect(page).toHaveURL(/\/pedidos\/nuevo\?mesa=\d+$/)
  await expect(page.getByText('Seleccionar mesa')).toHaveCount(0)
  await page.getByLabel('Nombre del cliente').fill('Mesa obligatoria')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('region', { name: 'Lista del menú' })).toBeVisible()
})
