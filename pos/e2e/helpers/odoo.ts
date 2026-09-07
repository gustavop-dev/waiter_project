import { expect, type Page } from '@playwright/test'

// Empleados demo sembrados por `projectapp_ops` (seed_employees) en la base compartida.
export const DEMO_EMPLOYEE = { name: 'Sofía Mesera', pin: '123456' }
export const DEMO_CASHIER = { name: 'Carlos Cajero', pin: '654321' }
export const DEMO_ADMIN = { name: 'Laura Encargada', pin: '112233' }

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

// El rol de la pantalla es el del PIN marcado: para trabajar como administrador hay que marcar el de un
// empleado administrador, no basta con la credencial del terminal.
export async function loginAsAdmin(page: Page) {
  await loginAs(page, 'admin', 'admin', DEMO_ADMIN.name, DEMO_ADMIN.pin)
}

// Cualquier mesa libre del plano. Los recorridos no pueden fijar un número: la base demo es compartida y
// las corridas anteriores dejan mesas ocupadas o reservadas.
export async function openFreeTable(page: Page): Promise<string> {
  const free = page.getByRole('button', { name: /^Mesa \d+: Disponible/ }).first()
  await expect(free).toBeVisible({ timeout: 30_000 })
  const label = (await free.getAttribute('aria-label')) ?? ''
  await free.click()
  return label.match(/^Mesa (\d+):/)?.[1] ?? ''
}
