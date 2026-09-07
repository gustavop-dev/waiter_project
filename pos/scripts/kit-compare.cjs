// Captura rutas del POS a 1194×834 (iPad Pro 11 apaisado, el marco del kit) para cotejarlas con docs/diseno/pos-kit/pantallas.
// Uso: npm run kit:compare -- /kit /salon   (requiere `next dev` en PLAYWRIGHT_BASE_URL o http://localhost:3000 y Odoo demo con admin/admin)
// Tema: KIT_THEME=dark fija localStorage.waiter.theme antes de entrar y añade el sufijo "-dark" a la captura.
// Acciones: una ruta puede llevar "#click=<texto del botón>" para abrir un modal antes de capturar (p. ej. "/ventas#click=Cerrar caja").
const { chromium, devices } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

async function main() {
  const routes = process.argv.slice(2)
  if (routes.length === 0) { console.error('Indica al menos una ruta, por ejemplo: npm run kit:compare -- /kit'); process.exit(1) }
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  const theme = process.env.KIT_THEME || 'light'
  const out = process.env.KIT_OUT || path.join(__dirname, '..', 'kit-compare'); fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ ...devices['iPad Pro 11 landscape'] })
  await context.addInitScript((mode) => { try { localStorage.setItem('waiter.theme', mode) } catch { /* sin almacenamiento */ } }, theme)
  const page = await context.newPage()
  await page.goto(`${base}/login`)
  await page.getByLabel('Correo').fill('admin'); await page.getByLabel('Contraseña').fill('admin')
  await page.getByRole('button', { name: 'Abrir mi turno' }).click()
  await page.waitForURL('**/salon')
  for (const spec of routes) {
    const [route, action] = spec.split('#click=')
    await page.goto(`${base}${route}`); await page.waitForLoadState('networkidle')
    if (action) { await page.getByRole('button', { name: action }).first().click(); await page.waitForTimeout(800) }
    const name = `${route.replace(/\//g, '_').replace(/^_/, '') || 'root'}${action ? '_' + action.replace(/\W+/g, '-') : ''}${theme === 'dark' ? '-dark' : ''}`
    const file = path.join(out, `${name}.png`)
    await page.screenshot({ path: file }); console.log('captura', file)
  }
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
