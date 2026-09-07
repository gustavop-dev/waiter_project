// product.template.diner_attributes (addon projectapp_ops, Plan H contrato 2): objeto JSON que las plantillas del
// comensal pintan si existe. Aquí se lee con tolerancia (lo que no sea un objeto es {}) y se escribe sin claves vacías.
export type SpicyLevel = 0 | 1 | 2 | 3
export interface DinerSize { nombre: string; precio: number }
export interface DinerAttributes {
  piezas?: number; picante?: SpicyLevel; etiquetas?: string[]; alergenos?: string[]; abv?: number; ibu?: number; tamanos?: DinerSize[]; soloHoy?: boolean
}
export const SPICY_LEVELS: SpicyLevel[] = [0, 1, 2, 3]
export const EMPTY_ATTRIBUTES: DinerAttributes = {}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const list = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : undefined)

export function parseDinerAttributes(raw: string | false | null | undefined): DinerAttributes {
  if (!raw) return {}
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return {} }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const o = parsed as Record<string, unknown>
  const out: DinerAttributes = {}
  const piezas = num(o.piezas); if (piezas !== undefined) out.piezas = piezas
  const picante = num(o.picante); if (picante !== undefined && SPICY_LEVELS.includes(picante as SpicyLevel)) out.picante = picante as SpicyLevel
  const etiquetas = list(o.etiquetas); if (etiquetas?.length) out.etiquetas = etiquetas
  const alergenos = list(o.alergenos); if (alergenos?.length) out.alergenos = alergenos
  const abv = num(o.abv); if (abv !== undefined) out.abv = abv
  const ibu = num(o.ibu); if (ibu !== undefined) out.ibu = ibu
  if (Array.isArray(o.tamanos)) {
    const tamanos = o.tamanos.filter((t): t is DinerSize => Boolean(t) && typeof t === 'object' && typeof (t as DinerSize).nombre === 'string' && typeof (t as DinerSize).precio === 'number')
    if (tamanos.length) out.tamanos = tamanos.map((t) => ({ nombre: t.nombre, precio: t.precio }))
  }
  if (o.soloHoy === true) out.soloHoy = true
  return out
}

// Sin claves vacías; sin atributos devuelve false para que Odoo guarde NULL y la carta no lea "{}".
export function serializeDinerAttributes(a: DinerAttributes): string | false {
  const clean: DinerAttributes = {}
  if (a.piezas !== undefined && a.piezas > 0) clean.piezas = a.piezas
  if (a.picante !== undefined && a.picante > 0) clean.picante = a.picante
  if (a.etiquetas?.length) clean.etiquetas = a.etiquetas
  if (a.alergenos?.length) clean.alergenos = a.alergenos
  if (a.abv !== undefined && a.abv > 0) clean.abv = a.abv
  if (a.ibu !== undefined && a.ibu > 0) clean.ibu = a.ibu
  const tamanos = (a.tamanos ?? []).filter((t) => t.nombre.trim() !== '').map((t) => ({ nombre: t.nombre.trim(), precio: t.precio }))
  if (tamanos.length) clean.tamanos = tamanos
  if (a.soloHoy) clean.soloHoy = true
  return Object.keys(clean).length === 0 ? false : JSON.stringify(clean)
}

// "popular, sin gluten" ⇄ ['popular', 'sin gluten'] para los campos de texto del formulario.
export const listToText = (items: string[] | undefined): string => (items ?? []).join(', ')
export const textToList = (text: string): string[] => text.split(',').map((s) => s.trim()).filter(Boolean)
