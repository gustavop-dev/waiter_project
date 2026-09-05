import { callKw, jsonRpc } from '@/lib/services/odoo'

import type { Role } from '@/lib/domain/roles'

export interface AuthUser { uid: number; name: string; companyId: number; role: Role }
export interface PosSession { id: number; configId: number; state: 'opened' | 'opening_control' }

interface RawSession { id: number; config_id: [number, string]; state: PosSession['state'] }
interface RawAuth { uid: number; name: string; user_companies: { current_company: number } }
interface RawInfo { uid: number | false; name?: string; user_companies?: { current_company: number } }

const DB = process.env.NEXT_PUBLIC_ODOO_DB ?? 'projectapp'
const OPEN_STATES = ['opened', 'opening_control']

export async function login(loginName: string, password: string): Promise<AuthUser> {
  const raw = await jsonRpc<RawAuth>('/web/session/authenticate', { db: DB, login: loginName, password })
  return { uid: raw.uid, name: raw.name, companyId: raw.user_companies.current_company, role: await roleOf(raw.uid) }
}

// Quién está logueado según la cookie (HttpOnly: solo Odoo lo sabe). null si no hay sesión.
export async function currentUser(): Promise<AuthUser | null> {
  const raw = await jsonRpc<RawInfo>('/web/session/get_session_info', {})
  if (!raw.uid) return null
  return { uid: raw.uid, name: raw.name ?? '', companyId: raw.user_companies?.current_company ?? 0, role: await roleOf(raw.uid) }
}

// El rol lo pone el addon projectapp_ops en res.users; un usuario siempre puede leer el suyo.
async function roleOf(uid: number): Promise<Role> {
  const [row] = await callKw<{ waiter_role: Role | false }[]>('res.users', 'read', [[uid], ['waiter_role']])
  return row.waiter_role || 'waiter'
}

export function logout(): Promise<void> {
  return jsonRpc<void>('/web/session/destroy', {})
}

function toSession(raw: RawSession): PosSession {
  return { id: raw.id, configId: raw.config_id[0], state: raw.state }
}

export async function getOpenSession(): Promise<PosSession | null> {
  const rows = await callKw<RawSession[]>('pos.session', 'search_read',
    [[['state', 'in', OPEN_STATES]], ['id', 'config_id', 'state']], { limit: 1 })
  return rows.length ? toSession(rows[0]) : null
}

export async function ensureOpenSession(configId: number): Promise<PosSession> {
  const open = await getOpenSession()
  if (open) return open
  const id = await callKw<number>('pos.session', 'create', [{ config_id: configId }])
  await callKw<void>('pos.session', 'action_pos_session_open', [[id]])
  return { id, configId, state: 'opening_control' }
}
