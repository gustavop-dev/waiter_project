import { expect, type Page } from '@playwright/test'

// Empleados demo sembrados por `projectapp_ops` (seed_employees) en la base compartida.
export const DEMO_EMPLOYEE = { name: 'Sofía Mesera', pin: '123456' }
export const DEMO_CASHIER = { name: 'Carlos Cajero', pin: '654321' }

// "Inicio de empleado" del kit: elegir la cuenta, escribir el PIN en el teclado en pantalla e iniciar turno.
export async function startShiftAs(page: Page, employee = DEMO_EMPLOYEE.name, pin = DEMO_EMPLOYEE.pin) {
  await page.getByRole('button', { name: 'Empleado' }).click()
  await page.getByRole('option', { name: new RegExp(employee) }).click()
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click()
  await page.getByRole('button', { name: 'Iniciar turno' }).click()
}

// Login completo del terminal: correo y contraseña de Odoo y luego el empleado con su PIN.
export async function loginAs(page: Page, login: string, password: string, employee = DEMO_EMPLOYEE.name, pin = DEMO_EMPLOYEE.pin) {
  await page.goto('/login')
  const submit = page.getByRole('button', { name: /Entrar|Abrir mi turno/ })
  // En `next dev` la hidratación puede llegar después del primer relleno y React devuelve los campos a vacío:
  // se rellena de nuevo hasta que el botón queda habilitado.
  await expect(async () => {
    await page.getByLabel('Correo').fill(login)
    await page.getByLabel('Contraseña').fill(password)
    await expect(submit).toBeEnabled({ timeout: 1_000 })
  }).toPass({ timeout: 30_000 })
  await submit.click()
  await startShiftAs(page, employee, pin)
  await page.waitForURL('**/salon')
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, 'admin', 'admin')
}
