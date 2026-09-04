import { http } from '@/lib/services/odoo'

export const ODOO_ORIGIN = process.env.ODOO_ORIGIN ?? 'http://192.168.56.10:8069'
export const ODOO_DB = process.env.ODOO_DB ?? 'projectapp'
export const ODOO_LOGIN = process.env.ODOO_LOGIN ?? 'admin'
export const ODOO_PASSWORD = process.env.ODOO_PASSWORD ?? 'admin'

// Los contratos hablan con Odoo directo, sin Next en medio.
http.defaults.baseURL = ODOO_ORIGIN

// En Node axios no persiste cookies: se guarda session_id y se reenvía.
let cookie = ''
http.interceptors.response.use((r) => {
  const set = r.headers['set-cookie']?.[0]
  cookie = set ? set.split(';')[0] : cookie
  return r
})
http.interceptors.request.use((c) => {
  c.headers.Cookie = cookie
  return c
})
