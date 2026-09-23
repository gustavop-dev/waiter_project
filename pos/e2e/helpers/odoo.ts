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

// Cobra la mesa desde Pedidos, que es donde se cobra: Mesas ya no ofrece el cobro. Se localiza la comanda
// de esa mesa, se paga en efectivo con un billete que sobra y se cierra el aviso de cobro exitoso.
export async function chargeTable(page: Page, mesa: string) {
  await page.goto('/pedidos')
  const card = page.getByRole('article').filter({ hasText: new RegExp(`Mesa ${mesa}\\b`) }).first()
  await expect(card).toBeVisible({ timeout: 30_000 })
  await card.getByRole('link', { name: 'Cobrar' }).click()
  await expect(page).toHaveURL(/\/pago\/\d+/)
  const pay = page.getByRole('dialog', { name: 'Pago' })
  await pay.getByRole('button', { name: '100.000' }).click()
  await pay.getByRole('button', { name: 'Pagar ahora' }).click()
  await page.getByRole('button', { name: 'Listo' }).click()
  // La mesa queda libre en el plano. Se comprueba allí y no en Pedidos porque es lo que ve el mesero; se
  // recarga para no esperar al sondeo de 30 s. No se mira "Disponible": una reserva del día la deja "Reservada".
  await page.goto('/salon')
  await expect(page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: (En progreso|Listo|Servido|Esperando pago)`) })).toHaveCount(0, { timeout: 30_000 })
}

// Cocina saca al pase todas las comandas de la mesa ("Listo todo"). Son varias cuando el mesero agregó
// rondas: cada ronda es un curso y cada curso, una comanda.
export async function kitchenReady(page: Page, mesa: string) {
  await page.goto('/kds')
  const tickets = page.getByRole('article', { name: `Mesa ${mesa}` })
  await expect(tickets.first()).toBeVisible({ timeout: 30_000 })
  for (let left = await tickets.count(); left > 0; left -= 1) {
    const start = tickets.first().getByRole('button', { name: 'Iniciar preparación' })
    if (await start.count()) await start.click()
    await tickets.first().getByRole('button', { name: 'Listo todo' }).click()
    await expect(tickets).toHaveCount(left - 1)
  }
}

// El mesero lleva a la mesa lo que cocina dejó en el pase, desde el detalle de la mesa. Con dos o más platos
// hay "Entregar todo"; con uno solo, el botón de ese plato. Se pulsa lo que haya hasta que no quede nada.
export async function deliverTable(page: Page, mesa: string) {
  await page.goto('/salon')
  await page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: `) }).click()
  await page.getByRole('button', { name: 'Detalle de mesa' }).click()
  const detail = page.getByRole('dialog', { name: 'Detalle de mesa' })
  const pending = detail.getByRole('button', { name: /^Entregar/ })
  await expect(pending.first()).toBeVisible({ timeout: 30_000 })
  // "Entregar todo" se lleva varios de un golpe y el botón de un plato solo uno: se comprueba que quedan
  // menos, no cuántos.
  for (let guard = 0; guard < 10; guard += 1) {
    const left = await pending.count()
    if (left === 0) break
    await pending.first().click()
    await expect(async () => { expect(await pending.count()).toBeLessThan(left) }).toPass({ timeout: 20_000 })
  }
  await page.getByRole('button', { name: 'Cerrar' }).first().click()
}

// Cocina lo saca y el mesero lo lleva: el recorrido completo hasta que la mesa se puede cobrar.
export async function kitchenReadyAndServe(page: Page, mesa: string) {
  await kitchenReady(page, mesa)
  await deliverTable(page, mesa)
}
