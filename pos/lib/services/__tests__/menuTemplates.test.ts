import { base64url, gateway, listTemplates, previewUrl, type MenuSettings } from '@/lib/services/menuTemplates'
import { jsonRpc } from '@/lib/services/odoo'

jest.mock('@/lib/services/odoo', () => ({ jsonRpc: jest.fn() }))
const rpc = jsonRpc as jest.Mock
const SETTINGS: MenuSettings = { plantilla: 'A1', paleta: { acento: '#7A2E2A' }, tipografia: { display: 'Fraunces' } }

beforeEach(() => { rpc.mockReset(); (globalThis as { fetch?: unknown }).fetch = jest.fn() })

// Falla si la lectura no va por la pasarela del addon (misma sesión de Odoo) o si la acción no viaja en los params.
it('reads the venue settings through the addon gateway with action get', async () => {
  const ctx = { restaurante: 'burger-house', sede: 'poblado', experienceUrl: 'http://exp', dinerUrl: 'http://diner', ajustes: SETTINGS }
  rpc.mockResolvedValueOnce(ctx)
  await expect(gateway('get')).resolves.toEqual(ctx)
  expect(rpc).toHaveBeenCalledWith('/waiter/admin/menu_settings', { action: 'get' })
})

// Falla si guardar no manda plantilla, paleta y tipografía planos junto a action set (la forma que espera el addon).
it('writes the settings with action set and returns the resolved template', async () => {
  rpc.mockResolvedValueOnce({ codigo: 'A1', nombre: 'Carta editorial', familia: 'A', tokens: { acento: '#7A2E2A' } })
  await expect(gateway('set', SETTINGS)).resolves.toMatchObject({ codigo: 'A1' })
  expect(rpc).toHaveBeenCalledWith('/waiter/admin/menu_settings', { action: 'set', plantilla: 'A1', paleta: { acento: '#7A2E2A' }, tipografia: { display: 'Fraunces' } })
})

// Falla si el catálogo se pide a otra ruta, si una barra final duplica el separador o si un HTTP de error se devuelve como catálogo.
it('fetches the public catalog from experience and rejects HTTP errors', async () => {
  const f = globalThis.fetch as jest.Mock
  const catalog = { familias: { A: 'Alta cocina' }, plantillas: [] }
  f.mockResolvedValueOnce({ ok: true, status: 200, json: async () => catalog })
  await expect(listTemplates('http://192.168.56.10:8001/')).resolves.toEqual(catalog)
  expect(f).toHaveBeenCalledWith('http://192.168.56.10:8001/api/v1/plantillas/')
  f.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
  await expect(listTemplates('http://192.168.56.10:8001')).rejects.toThrow('HTTP 503')
})

// Falla si la vista previa no apunta a la entrada de la sede o si el JSON no viaja en base64url (sin +, / ni =).
it('builds the diner preview URL with the settings as base64url JSON', () => {
  const url = previewUrl('http://192.168.56.10:3001/', 'burger-house', 'poblado', SETTINGS)
  const [base, query] = url.split('?vista_previa=')
  expect(base).toBe('http://192.168.56.10:3001/burger-house/poblado/')
  expect(query).toMatch(/^[A-Za-z0-9_-]+$/)
  const decoded = Buffer.from(query.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  expect(JSON.parse(decoded)).toEqual(SETTINGS)
})

// Falla si un texto con acentos (fuera de Latin-1) rompe btoa o si el alfabeto no es el de la URL.
it('encodes UTF-8 text as base64url', () => {
  expect(base64url('Menú «día»')).toBe(Buffer.from('Menú «día»', 'utf8').toString('base64url'))
  expect(base64url('??>')).toBe('Pz8-')
})
