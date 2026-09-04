import { callKw, jsonRpc } from '@/lib/services/odoo'
import { ensureOpenSession, getOpenSession, login } from '@/lib/services/session'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn(), jsonRpc: jest.fn() }))
const mockCallKw = callKw as jest.Mock
const mockRpc = jsonRpc as jest.Mock

beforeEach(() => { mockCallKw.mockReset(); mockRpc.mockReset() })

// Falla si el login deja de mandar la base de datos: con dos bases Odoo responde 404.
it('authenticates against the configured database and maps the user', async () => {
  mockRpc.mockResolvedValue({ uid: 2, name: 'Mitchell Admin', user_companies: { current_company: 1 } })
  const user = await login('admin', 'admin')
  expect(mockRpc).toHaveBeenCalledWith('/web/session/authenticate', { db: 'projectapp', login: 'admin', password: 'admin' })
  expect(user).toEqual({ uid: 2, name: 'Mitchell Admin', companyId: 1 })
})

// Falla si se toma como abierta una sesión en estado closed.
it('returns null when no session is opened or in opening control', async () => {
  mockCallKw.mockResolvedValue([])
  await expect(getOpenSession()).resolves.toBeNull()
  expect(mockCallKw.mock.calls[0][2][0]).toEqual([['state', 'in', ['opened', 'opening_control']]])
})

// Falla si ensureOpenSession crea una sesión nueva habiendo una abierta (duplica cajas).
it('reuses the open session instead of creating another one', async () => {
  mockCallKw.mockResolvedValueOnce([{ id: 4, config_id: [1, 'Salón'], state: 'opened' }])
  const s = await ensureOpenSession(1)
  expect(s).toEqual({ id: 4, configId: 1, state: 'opened' })
  expect(mockCallKw).toHaveBeenCalledTimes(1)
})
