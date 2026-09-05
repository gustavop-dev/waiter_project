// /[rest]/[sede]/(t/<token>/)?(pantalla)?(/id)? — una sola página despacha; domicilio y mesa comparten todo.
// 'la-cuenta' es pedir la cuenta al salón (Plan F); 'cuenta' es Mi cuenta del comensal (Plan H) con 'registro' y 'codigo' debajo.
export type Screen = 'portada' | 'carta' | 'plato' | 'pedido' | 'estado' | 'la-cuenta' | 'pago' | 'cuenta' | 'cuenta/registro' | 'cuenta/codigo'
export interface Route { token: string | null; screen: Screen; id: string | null }
const SCREENS: Screen[] = ['carta', 'plato', 'pedido', 'estado', 'la-cuenta', 'pago', 'cuenta']
const ACCOUNT_SUBSCREENS = ['registro', 'codigo'] as const

export function parseRoute(segments: string[] = []): Route {
  const rest = [...segments]
  let token: string | null = null
  if (rest[0] === 't' && rest[1]) { token = rest[1]; rest.splice(0, 2) }
  const head = rest[0] ?? ''
  if (head === 'cuenta' && (ACCOUNT_SUBSCREENS as readonly string[]).includes(rest[1] ?? '')) return { token, screen: `cuenta/${rest[1]}` as Screen, id: null }
  const screen = (SCREENS as string[]).includes(head) ? (head as Screen) : 'portada'
  return { token, screen, id: screen === 'portada' ? null : rest[1] ?? null }
}

export function pathFor(rest: string, venue: string, token: string | null, screen: Screen, id?: string | number): string {
  const head = `/${rest}/${venue}${token ? `/t/${token}` : ''}`
  return screen === 'portada' ? head : `${head}/${screen}${id !== undefined ? `/${id}` : ''}`
}
