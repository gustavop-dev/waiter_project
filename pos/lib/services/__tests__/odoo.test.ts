import axios from 'axios'

import { callKw } from '@/lib/services/odoo'

jest.mock('axios', () => {
  const post = jest.fn()
  return { __esModule: true, default: { create: () => ({ post }), post }, post }
})
const post = (axios as unknown as { post: jest.Mock }).post

beforeEach(() => post.mockReset())

// Falla si el cliente deja de envolver la llamada en el sobre JSON-RPC 2.0 de Odoo.
it('sends model, method, args and kwargs inside the JSON-RPC envelope', async () => {
  post.mockResolvedValue({ data: { jsonrpc: '2.0', id: 1, result: [{ id: 7 }] } })
  await callKw('pos.config', 'search_read', [[], ['name']], { context: { lang: 'es_CO' } })
  const [path, body] = post.mock.calls[0]
  expect(path).toBe('/web/dataset/call_kw')
  expect(body.params).toEqual({
    model: 'pos.config', method: 'search_read', args: [[], ['name']], kwargs: { context: { lang: 'es_CO' } },
  })
})

// Falla si una respuesta sin `result` (método que devuelve None) se trata como error.
it('resolves to undefined when Odoo omits the result key', async () => {
  post.mockResolvedValue({ data: { jsonrpc: '2.0', id: 1 } })
  await expect(callKw('pos.order', 'add_payment', [[3], {}])).resolves.toBeUndefined()
})

// Falla si un error de negocio de Odoo (HTTP 200 + clave error) se pierde como éxito.
it('rejects with OdooError carrying the Odoo message and type', async () => {
  post.mockResolvedValue({ data: { jsonrpc: '2.0', id: 1, error: {
    message: 'Odoo Server Error', data: { name: 'odoo.exceptions.UserError', message: 'Invalid preset' } } } })
  await expect(callKw('pos.order', 'sync_from_ui', [[]])).rejects.toMatchObject({
    message: 'Invalid preset', odooType: 'odoo.exceptions.UserError',
  })
})
