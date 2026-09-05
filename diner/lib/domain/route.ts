// /[rest]/[sede]/(t/<token>/)?(pantalla)?(/id)? — una sola página despacha; domicilio y mesa comparten todo.
export type Screen = 'portada' | 'carta' | 'plato' | 'pedido' | 'estado' | 'cuenta'
export interface Route { token: string | null; screen: Screen; id: string | null }
const SCREENS: Screen[] = ['carta', 'plato', 'pedido', 'estado', 'cuenta']

export function parseRoute(segments: string[] = []): Route {
  const rest = [...segments]
  let token: string | null = null
  if (rest[0] === 't' && rest[1]) { token = rest[1]; rest.splice(0, 2) }
  const screen = (SCREENS as string[]).includes(rest[0] ?? '') ? (rest[0] as Screen) : 'portada'
  return { token, screen, id: screen === 'portada' ? null : rest[1] ?? null }
}

export function pathFor(rest: string, venue: string, token: string | null, screen: Screen, id?: string | number): string {
  const head = `/${rest}/${venue}${token ? `/t/${token}` : ''}`
  return screen === 'portada' ? head : `${head}/${screen}${id !== undefined ? `/${id}` : ''}`
}
