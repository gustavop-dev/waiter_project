import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: salon-view-tables  @outcome: display
test('the floor shows the seeded tables with their state word', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page.getByRole('tab', { name: 'Terraza' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Mesa 1: Disponible/ })).toBeVisible()
  await expect(page.getByText('Toca una mesa para ver su cuenta')).toBeVisible()
})
