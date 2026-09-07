import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

const cart = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Detalle del pedido' })

// @flow: kit-create-order-dine-in  @outcome: success
test('el mesero crea un pedido en mesa desde el wizard del kit y lo envía a cocina', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/pedidos/nuevo')
  await expect(page.getByRole('heading', { name: 'Información del pedido' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'En mesa' })).toHaveAttribute('aria-checked', 'true')
  await page.getByLabel('Nombre del cliente').fill('E2E kit en mesa')
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Paso 2: plano con leyenda y barra "Mesa seleccionada"
  await expect(page.getByText('No seleccionable')).toBeVisible()
  await page.locator('button[aria-pressed="false"]:not([disabled])').filter({ hasText: 'Mesa' }).first().click()
  await expect(page.getByText('Mesa seleccionada:')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Paso 3: modal "Agregar plato" con el grupo obligatorio de adiciones
  await page.getByPlaceholder('Buscar plato').fill('Hamburguesa Angus')
  await page.getByRole('button', { name: 'Agregar', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Agregar al carrito' })).toBeDisabled()
  await page.getByRole('radio', { name: /BBQ/ }).click()
  await page.getByLabel('Nota para cocina').fill('sin cebolla')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await expect(cart(page).getByText('Nota: sin cebolla')).toBeVisible()
  await expect(cart(page).getByText('Adición: BBQ')).toBeVisible()
  await cart(page).getByRole('button', { name: 'Continuar' }).click()

  // Paso 4: resumen y creación real en Odoo
  await expect(page.getByText('E2E kit en mesa')).toBeVisible()
  await page.getByRole('button', { name: 'Crear pedido y enviar a cocina' }).click()
  await expect(page.getByRole('status')).toContainText(/¡Pedido #DI\d+ creado!/)
})

// @flow: kit-create-order-take-away-pay  @outcome: success
test('para llevar pasa por el pago del kit y cobra en efectivo', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/pedidos/nuevo')
  await page.getByRole('radio', { name: 'Para llevar' }).click()
  await page.getByLabel('Nombre del cliente').fill('E2E kit llevar')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByPlaceholder('Buscar plato').fill('Adición de tocineta')
  await page.getByRole('button', { name: 'Agregar', exact: true }).first().click()
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await cart(page).getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar al pago' }).click()

  const modal = page.getByRole('dialog', { name: 'Pago' })
  await expect(modal.getByText('Detalle del pedido')).toBeVisible()
  await modal.getByRole('tab', { name: 'Tarjeta' }).click()
  await expect(modal.getByText('Completa el pago en')).toBeVisible()
  await modal.getByRole('tab', { name: 'Efectivo' }).click()
  await modal.getByRole('button', { name: '100.000' }).click()
  await modal.getByRole('button', { name: 'Pagar ahora' }).click()
  await expect(page.getByRole('dialog', { name: '¡Pago exitoso!' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Cambio')).toBeVisible()
  await page.getByRole('button', { name: 'Listo' }).click()
  await expect(page.getByRole('status')).toContainText(/¡Pedido #TA\d+ creado!/)
})
