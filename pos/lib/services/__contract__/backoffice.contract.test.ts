import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { addProduct, createDraft } from '@/lib/domain/order'
import { listCustomers, saveCustomer } from '@/lib/services/customers'
import { invoiceOrder, listInvoices } from '@/lib/services/invoices'
import { closeOrder, payOrder, saveOrder } from '@/lib/services/orders'
import { loadPosData } from '@/lib/services/posData'
import { getOpenSession, login } from '@/lib/services/session'
import { callKw } from '@/lib/services/odoo'
import { createUser, listFloors, saveSettings } from '@/lib/services/settings'

// Falla si Odoo exige más que un cliente para facturar un pedido pagado, o si el cliente nuevo no queda como tal.
it('invoices a paid order to a freshly created customer against the real Odoo', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = (await getOpenSession())!
  const catalog = await loadPosData(session.id)
  const angus = catalog.products.find((p) => p.name.includes('Angus'))!
  const cash = catalog.paymentMethods.find((m) => m.type === 'cash')!
  const saved = await saveOrder(addProduct(createDraft({ sessionId: session.id, tableId: catalog.tables[0].id, guests: 1 }), angus))
  await payOrder(saved.id, cash.id, saved.total)
  await closeOrder(saved.id)
  const partnerId = await saveCustomer(null, { name: 'Cliente Contrato', phone: '3000000000', email: '', vat: '900123456', idTypeId: null, street: '', city: 'Medellín' })
  const invoiceId = await invoiceOrder(saved.id, partnerId)
  const invoice = (await listInvoices(5)).find((i) => i.id === invoiceId)!
  expect(invoice.partner).toBe('Cliente Contrato')
  expect(invoice.total).toBe(saved.total)
  expect((await listCustomers('900123456')).map((c) => c.name)).toContain('Cliente Contrato')
})

// Falla si los supuestos no se guardan en pos.config, si un usuario nuevo no se puede crear con solo nombre, login y clave,
// o si los pisos no traen sus mesas.
it('saves settings, creates a user and reads floors with tables', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = (await getOpenSession())!
  const { settings } = await loadPosData(session.id)
  await saveSettings({ ...settings, alertLateMinutes: 19 })
  const [cfg] = await callKw<{ alert_late_minutes: number }[]>('pos.config', 'read', [[settings.configId], ['alert_late_minutes']])
  expect(cfg.alert_late_minutes).toBe(19)
  await saveSettings(settings)
  const userId = await createUser({ name: 'Mesero Contrato', login: `contrato-${Date.now()}`, password: 'Prueba-1234', role: 'waiter' })
  await callKw('res.users', 'write', [[userId], { active: false }])
  const floors = await listFloors()
  expect(floors[0].tables.length).toBeGreaterThan(0)
})
