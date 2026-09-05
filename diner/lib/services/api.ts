import axios from 'axios'

import type { Account, AccountSummary, Bill, Cart, Entry, OrderStatus, PayMethod, PayResult, RegisterForm, Session, TemplateCatalog } from '@/lib/types'

// Único punto de I/O del comensal: la API pública del bloque 3, por el proxy same-origin (/api → experience).
export const http = axios.create({ baseURL: '', withCredentials: true, timeout: 15_000 })

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

http.interceptors.response.use((r) => r, (error) => {
  const status = error?.response?.status ?? 0
  const detail = error?.response?.data?.detail
  return Promise.reject(new ApiError(typeof detail === 'string' ? detail : status ? `Error ${status}` : 'Sin conexión', status))
})

const base = (rest: string, venue: string, token: string | null) => `/api/v1/${rest}/${venue}/${token ? `t/${token}/` : ''}`

export async function getEntry(rest: string, venue: string, token: string | null): Promise<Entry> {
  return (await http.get<Entry>(base(rest, venue, token))).data
}
export async function openSession(rest: string, venue: string, token: string | null): Promise<{ sesion: Session; comensal: { id: string } }> {
  return (await http.post('/api/v1/sesiones/', { restaurante: rest, sede: venue, token: token ?? undefined })).data
}
export async function getCart(sessionId: string): Promise<Cart> {
  return (await http.get<Cart>(`/api/v1/sesiones/${sessionId}/carrito/`)).data
}
export async function addLine(sessionId: string, productId: number, qty: number, note: string): Promise<Cart> {
  return (await http.post<Cart>(`/api/v1/sesiones/${sessionId}/lineas/`, { producto_id: productId, cantidad: qty, nota: note })).data
}
export async function updateLine(sessionId: string, lineId: number, patch: { cantidad?: number; nota?: string }): Promise<Cart> {
  return (await http.patch<Cart>(`/api/v1/sesiones/${sessionId}/lineas/${lineId}/`, patch)).data
}
export async function removeLine(sessionId: string, lineId: number): Promise<Cart> {
  return (await http.delete<Cart>(`/api/v1/sesiones/${sessionId}/lineas/${lineId}/`)).data
}
export async function confirmOrder(sessionId: string): Promise<{ pedido: string; estado: string; total: number }> {
  return (await http.post(`/api/v1/sesiones/${sessionId}/confirmar/`)).data
}
export async function getOrder(orderId: string): Promise<OrderStatus> {
  return (await http.get<OrderStatus>(`/api/v1/pedidos/${orderId}/`)).data
}
export async function callWaiter(sessionId: string): Promise<boolean> {
  return (await http.post<{ ok: boolean }>(`/api/v1/sesiones/${sessionId}/llamar/`)).data.ok
}
export async function requestBill(sessionId: string): Promise<Bill> {
  return (await http.post<Bill>(`/api/v1/sesiones/${sessionId}/cuenta/`)).data
}

// ---- Plan H: plantillas, cuenta y pago maquetado (contrato 3). Si experience aún no expone estos endpoints, fallan con ApiError. ----
export async function getTemplates(): Promise<TemplateCatalog> {
  return (await http.get<TemplateCatalog>('/api/v1/plantillas/')).data
}
export async function registerAccount(form: RegisterForm): Promise<{ id: string; codigoDemo: boolean }> {
  return (await http.post('/api/v1/cuenta/registro/', form)).data
}
// En demo el backend acepta cualquier código de seis dígitos y liga la cuenta a la cookie del comensal.
export async function verifyAccount(id: string, codigo: string): Promise<{ ok?: boolean; cuenta?: Account }> {
  return (await http.post('/api/v1/cuenta/verificar/', { id, codigo })).data
}
export async function getAccount(): Promise<AccountSummary> {
  return (await http.get<AccountSummary>('/api/v1/cuenta/')).data
}
export async function logoutAccount(): Promise<void> {
  await http.post('/api/v1/cuenta/salir/')
}
// No toca Odoo: devuelve { estado: 'aprobado', referencia, demo: true }. El POS sigue cobrando en la mesa.
export async function simulatePayment(sessionId: string, metodo: PayMethod, monto: number): Promise<PayResult> {
  return (await http.post<PayResult>(`/api/v1/sesiones/${sessionId}/pago/simulado/`, { metodo, monto })).data
}
