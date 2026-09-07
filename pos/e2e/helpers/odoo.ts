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

// ——— Pedidos por el asistente del kit ———

// `dish` acepta varios: cantidad, nota y adición se aplican al primero, que es el que suelen mirar las pruebas.
export interface NewOrderOptions { customer: string; dish?: string | string[]; qty?: number; note?: string; option?: RegExp }

// Recorre el asistente "Crear pedido" (cliente → mesa → menú → resumen) y devuelve el número de la mesa elegida.
// La base demo es compartida: la mesa es la primera libre del plano, nunca una fija.
export async function createOrder(page: Page, options: NewOrderOptions): Promise<string> {
  const { customer, dish = 'Hamburguesa Angus', qty = 1, note, option = /BBQ/ } = options
  const dishes = Array.isArray(dish) ? dish : [dish]
  await page.goto('/pedidos/nuevo')
  await page.getByLabel('Nombre del cliente').fill(customer)
  await page.getByRole('button', { name: 'Continuar' }).click()

  const table = page.locator('button[aria-pressed="false"]:not([disabled])').filter({ hasText: 'Mesa' }).first()
  await expect(table).toBeVisible({ timeout: 30_000 })
  const number = ((await table.innerText()).match(/Mesa (\d+)/) ?? [])[1] ?? ''
  await table.click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  for (const [i, name] of dishes.entries()) {
    await page.getByPlaceholder('Buscar plato').fill(name)
    await page.getByRole('button', { name: 'Agregar', exact: true }).first().click()
    const modal = page.getByRole('dialog')
    const choice = modal.getByRole('radio', { name: option })
    if (await choice.count()) await choice.first().click()
    if (i === 0) {
      for (let n = 1; n < qty; n += 1) await modal.getByRole('button', { name: 'Más', exact: true }).click()
      if (note) await modal.getByLabel('Nota para cocina').fill(note)
    }
    await modal.getByRole('button', { name: 'Agregar al carrito' }).click()
  }

  await page.getByRole('region', { name: 'Detalle del pedido' }).getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Crear pedido y enviar a cocina' }).click()
  await expect(page.getByRole('status')).toContainText(/creado/)
  return number
}

// Cobra la mesa desde el salón: se elige en el plano, se abre su detalle y se paga en efectivo.
// "Ir a pagar" solo se habilita con todos los platos entregados, que es la regla del kit.
export async function chargeTable(page: Page, mesa: string) {
  await page.goto('/salon')
  await page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: `) }).click()
  await page.getByRole('button', { name: 'Detalle de mesa' }).click()
  const detail = page.getByRole('dialog', { name: 'Detalle de mesa' })
  await detail.getByRole('button', { name: 'Ir a pagar' }).click()
  await page.getByRole('button', { name: 'Agregar pago' }).click()
  await page.getByRole('button', { name: 'Confirmar cobro' }).click()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  // El plano se sondea cada 30 s; se recarga para no esperar al siguiente sondeo. La mesa queda sin pedido:
  // se comprueba así y no con "Disponible", porque una reserva del día la deja en "Reservada".
  await page.reload()
  await expect(page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: (En progreso|Listo|Servido|Esperando pago)`) })).toHaveCount(0, { timeout: 30_000 })
}

// Cocina marca listas todas las comandas de la mesa y las entrega desde "Listos por entregar".
// Son varias cuando el mesero agregó rondas: cada ronda es un curso y cada curso, una comanda.
export async function kitchenReadyAndServe(page: Page, mesa: string) {
  await page.goto('/kds')
  const tickets = page.getByRole('article', { name: `Mesa ${mesa}` })
  await expect(tickets.first()).toBeVisible({ timeout: 30_000 })
  for (let left = await tickets.count(); left > 0; left -= 1) {
    await tickets.first().getByRole('button', { name: 'Listo' }).click()
    await expect(tickets).toHaveCount(left - 1)
  }
  const ready = page.getByRole('complementary', { name: 'Listos por entregar' })
  const cards = ready.getByRole('listitem', { name: `Mesa ${mesa}` })
  for (let left = await cards.count(); left > 0; left -= 1) {
    await cards.first().getByRole('button', { name: 'Entregar todo' }).click()
    await expect(cards).toHaveCount(left - 1)
  }
}
