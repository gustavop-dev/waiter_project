// Cuánto le pide cada pantalla a Odoo en régimen: llamadas por minuto, por modelo, y bytes de respuesta.
// Sirve para responder "¿aguanta con veinte meseros?" con números en vez de con intuición.
// Uso: node scripts/bench-sondeo.cjs   (WINDOW=60000 para cambiar la ventana de medida)
// Mide el régimen, no el arranque: descarta la carga inicial de cada pantalla.
const { chromium } = require('@playwright/test')
const base = 'http://192.168.56.10:3000'
const WINDOW = Number(process.env.WINDOW || 60000)

async function login(page, employee, pin) {
  await page.goto(`${base}/login`)
  const submit = page.getByRole('button', { name: /Entrar|Abrir mi turno/ })
  for (let i = 0; i < 30 && (await submit.isDisabled()); i += 1) {
    await page.getByLabel('Correo').fill('admin'); await page.getByLabel('Contraseña').fill('admin'); await page.waitForTimeout(400)
  }
  await submit.click()
  await page.getByRole('button', { name: 'Empleado' }).click()
  await page.getByRole('option', { name: new RegExp(employee) }).click()
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click()
  await page.getByRole('button', { name: 'Iniciar turno' }).click()
  await page.waitForURL('**/salon')
}

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1194, height: 834 } })
  const page = await ctx.newPage()
  await login(page, 'Laura Encargada', '112233')

  for (const [name, path] of [['salon', '/salon'], ['pedidos', '/pedidos'], ['inicio', '/dashboard'], ['kds', '/kds']]) {
    const calls = []
    const onReq = (req) => { if (req.url().includes('/odoo/web/dataset/call_kw')) calls.push({ t: Date.now(), body: req.postData() || '', req }) }
    page.on('request', onReq)
    await page.goto(`${base}${path}`)
    await page.waitForTimeout(2000)
    calls.length = 0            // se descarta la carga inicial: se mide el régimen, no el arranque
    const t0 = Date.now()
    await page.waitForTimeout(WINDOW)
    page.off('request', onReq)
    const models = {}
    let bytes = 0
    for (const c of calls) {
      const m = (c.body.match(/"model"\s*:\s*"([^"]+)"/) || [])[1] || '?'
      const meth = (c.body.match(/"method"\s*:\s*"([^"]+)"/) || [])[1] || '?'
      const k = `${m}.${meth}`
      models[k] = (models[k] || 0) + 1
      const r = await c.req.response().catch(() => null)
      if (r) { const body = await r.body().catch(() => null); if (body) bytes += body.length }
    }
    const secs = (Date.now() - t0) / 1000
    console.log(`\n== ${name} (${secs.toFixed(0)} s) → ${calls.length} llamadas, ${(calls.length / secs * 60).toFixed(1)}/min, ${(bytes / 1024).toFixed(0)} KB`)
    Object.entries(models).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`   ${String(n).padStart(3)}  ${k}`))
  }
  await b.close()
})()
