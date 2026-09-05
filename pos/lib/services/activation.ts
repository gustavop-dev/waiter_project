import { jsonRpc } from '@/lib/services/odoo'

// Endpoints públicos del addon projectapp_ops (sin sesión): pedir código y activar cuenta / fijar contraseña.
export async function requestCode(login: string): Promise<void> {
  await jsonRpc<{ ok: boolean }>('/waiter/auth/request_code', { login: login.trim() })
}

export async function activate(login: string, code: string, password: string): Promise<boolean> {
  const r = await jsonRpc<{ ok: boolean; error?: string }>('/waiter/auth/activate', { login: login.trim(), code: code.trim(), password })
  return r.ok
}
