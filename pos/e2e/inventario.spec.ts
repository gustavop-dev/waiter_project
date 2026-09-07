import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// Datos: los siembra el addon projectapp_pantry al instalarse (2 proveedores, 8 ingredientes, recetas de los platos demo).
test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/inventario')
  await expect(page.getByRole('heading', { name: 'Lista del menú' })).toBeVisible()
})

// @flow: pantry-view-recipe  @outcome: display
test('the menu shows the servings of a dish and its recipe in the detail modal', async ({ page }) => {
  const card = page.getByRole('button', { name: 'Ver detalle de Hamburguesa Clásica' })
  await expect(card).toContainText(/Se pueden servir: \d+/)
  await card.click()
  const dialog = page.getByRole('dialog', { name: 'Detalle del plato' })
  await expect(dialog.getByText('Hamburguesa Clásica')).toBeVisible()
  await expect(dialog.getByRole('listitem').filter({ hasText: 'Carne de res Angus' })).toContainText('150 g')
  await expect(dialog.getByRole('listitem')).toHaveCount(5)
})

// @flow: pantry-add-ingredient  @outcome: persisted
test('adds an ingredient with category, unit and supplier', async ({ page }) => {
  const name = `E2E Cilantro ${Date.now().toString().slice(-6)}`
  await page.getByRole('tab', { name: 'Ingredientes' }).click()
  await page.getByRole('button', { name: 'Agregar ingrediente' }).click()
  const dialog = page.getByRole('dialog', { name: 'Agregar ingrediente' })
  await dialog.getByPlaceholder('Escribe el nombre del ingrediente').fill(name)
  await dialog.getByRole('button', { name: /Frutas y verduras/ }).click()
  await dialog.getByPlaceholder('Cantidad en stock').fill('3')
  await dialog.getByRole('button', { name: 'Manojo' }).click()
  await dialog.getByRole('button', { name: 'Guardar y continuar' }).click()
  await dialog.getByRole('radio', { name: /Distribuidora La Finca/ }).click()
  await dialog.getByRole('button', { name: 'Guardar y enviar' }).click()
  await expect(page.getByRole('status').filter({ hasText: '¡Ingrediente agregado!' })).toBeVisible()
  const row = page.getByRole('listitem').filter({ hasText: name })
  await expect(row).toContainText('Stock: 3 Manojo')
  await expect(row).toContainText('Distribuidora La Finca')
})

// @flow: pantry-request-ingredient  @outcome: persisted
test('requests an ingredient and sees it in the request list', async ({ page }) => {
  await page.getByRole('tab', { name: 'Ingredientes' }).click()
  await page.getByRole('button', { name: 'Más opciones de Salmón fresco' }).click()
  await page.getByRole('menuitem', { name: 'Solicitar ingrediente' }).click()
  await expect(page.getByRole('status').filter({ hasText: '¡Solicitud enviada!' })).toBeVisible()
  await page.getByRole('tab', { name: 'Solicitudes' }).click()
  const row = page.getByRole('listitem').filter({ hasText: 'Salmón fresco' }).first()
  await expect(row).toContainText('Carnes y Mares del Valle')
  await expect(row).toContainText('Borrador')
})
