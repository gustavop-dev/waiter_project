const { chromium, devices } = require('@playwright/test')
const B = 'http://192.168.56.10:3000'
;(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ ...devices['iPad Pro 11 landscape'] }); const p = await c.newPage()
  p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)))
  p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 220)) })
  p.on('response', (r) => { if (r.url().includes('/odoo/') && r.status() >= 400) console.log('HTTP', r.status(), r.url().slice(-60)) })
  await p.goto(B + '/login')
  const s = p.getByRole('button', { name: /Entrar|Abrir mi turno/ })
  for (let i = 0; i < 20; i++) { await p.getByLabel('Correo').fill('sofia'); await p.getByLabel('Contraseña').fill('Waiter-2026'); if (await s.isEnabled()) break; await p.waitForTimeout(500) }
  await s.click(); await p.waitForTimeout(3000)
  console.log('TRAS LOGIN', p.url(), '|', (await p.locator('body').innerText()).slice(0, 180).replace(/\n+/g, ' | '))
  const emp = p.getByRole('button', { name: 'Empleado' })
  if (await emp.count()) {
    console.log('deshabilitado?', await emp.isDisabled())
    await emp.click({ force: true }); await p.waitForTimeout(600)
    console.log('OPCIONES:', (await p.getByRole('option').allInnerTexts()).map(t => t.split('\n')[0]).join(' | '))
    await p.getByRole('option', { name: /Sofía Mesera/ }).click()
    for (const d of '123456') await p.getByRole('button', { name: d, exact: true }).click()
    await p.getByRole('button', { name: 'Iniciar turno' }).click()
    await p.waitForTimeout(9000)
    console.log('TRAS TURNO', p.url())
    const st = await p.evaluate(() => ({ kids: document.body.children.length, html: document.body.innerHTML.length, theme: document.documentElement.dataset.theme }))
    console.log('ESTADO', JSON.stringify(st))
    await p.screenshot({ path: 'kit-compare/rol-salon.png' })
  }
  await b.close()
})().catch((e) => { console.log('ERR', String(e).slice(0, 300)); process.exit(1) })
