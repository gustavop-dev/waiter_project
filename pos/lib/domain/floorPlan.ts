export const CELL = 20
export interface PlanRect { x: number; y: number; width: number; height: number }
export interface PlanTable extends PlanRect { id: number | null; key: string; number: number; seats: number; zone: string }
export interface Wall extends PlanRect { id: string }
export interface Zone extends PlanRect { id: string; name: string; color: string }
export interface FloorDocument { background?: string | null; backgroundSize?: { x?: number; y?: number; width: number; height: number } | null; id: number | null; name: string; revision: number; tables: PlanTable[]; walls: Wall[]; zones: Zone[] }
export const snap = (v: number) => Math.round(v / CELL) * CELL
export const overlaps = (a: PlanRect, b: PlanRect, gap = 16) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y
export const invalidTable = (t: PlanTable, plan: FloorDocument) => !Number.isInteger(t.number) || t.number < 1 || t.number > 9999 || !Number.isInteger(t.seats) || t.seats < 1 || t.seats > 100 || t.width < CELL || t.height < CELL || plan.tables.some((o) => o.key !== t.key && (o.number === t.number || overlaps(t, o))) || plan.walls.some((w) => overlaps(t, w))
export const zoneAt = (t: PlanRect, zones: Zone[]) => zones.find((z) => t.x + t.width / 2 >= z.x && t.x + t.width / 2 <= z.x + z.width && t.y + t.height / 2 >= z.y && t.y + t.height / 2 <= z.y + z.height)?.id ?? ''
export function extent(plan: Pick<FloorDocument, 'tables' | 'walls' | 'zones' | 'backgroundSize'>) {
 const all = [...plan.tables, ...plan.walls, ...plan.zones, ...(plan.backgroundSize ? [{x:0,y:0,...plan.backgroundSize}] : [])]
 const x=Math.min(0,...all.map(r=>r.x)), y=Math.min(0,...all.map(r=>r.y))
 return { x, y, width: Math.max(1200, ...all.map((r) => r.x + r.width + 100-x)), height: Math.max(800, ...all.map((r) => r.y + r.height + 100-y)) }
}

// Reubica el origen al guardar sin alterar distancias ni asociaciones entre elementos.
export function normalizePlan(plan: FloorDocument): FloorDocument {
 const rects = [...plan.tables,...plan.walls,...plan.zones,...(plan.backgroundSize?[{x:0,y:0,...plan.backgroundSize}]:[])]
 const dx=-Math.min(0,...rects.map(r=>r.x)), dy=-Math.min(0,...rects.map(r=>r.y))
 if (!dx&&!dy) return plan
 const shift=<T extends PlanRect>(r:T):T=>({...r,x:r.x+dx,y:r.y+dy})
 return {...plan,tables:plan.tables.map(shift),walls:plan.walls.map(shift),zones:plan.zones.map(shift),
  ...(plan.backgroundSize?{backgroundSize:shift({x:0,y:0,...plan.backgroundSize})}:{})}
}
export function planFits(plan: FloorDocument): boolean {
 const normalized=normalizePlan(plan)
 return [...normalized.tables,...normalized.walls,...normalized.zones,...(normalized.backgroundSize?[{x:0,y:0,...normalized.backgroundSize}]:[])].every(r=>
  [r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>=CELL&&r.height>=CELL&&r.x+r.width<=20000&&r.y+r.height<=20000)
}
