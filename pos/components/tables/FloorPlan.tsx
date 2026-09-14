'use client'

import { useTranslations } from 'next-intl'

import { PlanViewport } from '@/components/tables/PlanViewport'
import { extent, type FloorDocument } from '@/lib/domain/floorPlan'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { TableShape, type TablePill } from '@/components/tables/TableShape'
import type { TableState, TableView } from '@/lib/domain/tableState'
import { kitState, orderCode, planSize } from '@/lib/domain/tablesKit'
import type { TableReservation } from '@/lib/services/tables'
import { cn } from '@/lib/utils'

interface Props {
  plan?: FloorDocument | null; visibleIds?: number[] | null; views: TableView[]; selectedId: number | null; onSelect: (id: number) => void; background?: string | null; pickFree?: boolean
  codeFor?: (view: TableView) => string | null; reserved?: Record<number, TableReservation | null>
}

// Estado bajo la mesa, en las palabras del kit. Los estados que el kit no dibuja (asistencia, cuenta pedida…) van con
// la misma píldora naranja y su propio texto: son reales y el mesero los necesita.
export function pillFor(state: TableState, t: (key: string) => string): TablePill | null {
  if (state === 'free') return null
  if (state === 'served') return { text: t('served'), icon: 'check' }
  if (state === 'ready') return { text: t('ready'), icon: 'chef', tone: 'success' }
  if (state === 'billing') return { text: t('billing'), icon: 'receipt' }
  if (state === 'assist') return { text: t('assist'), icon: 'bell' }
  if (state === 'ordering') return { text: t('ordering'), icon: 'cart' }
  if (state === 'closed') return { text: t('closed'), icon: 'lock' }
  if (state === 'paid') return { text: t('paid'), icon: 'check' }
  return { text: t('inProgress'), icon: 'alarm' }
}

// Plano real del piso (posición y tamaño de restaurant.table) con scroll horizontal, como en el kit.
export function FloorPlan({ views, selectedId, onSelect, background = null, pickFree = false, codeFor, reserved = {}, plan, visibleIds }: Props) {
  const t = useTranslations('tables')
  const ts = useTranslations('tables.state')
  const size = plan ? extent(plan) : planSize(views.map((v) => v.table))
  if (views.length === 0 && !plan?.zones.length && !plan?.walls.length && !background) return <KitEmptyState icon="tables" title={t('emptyFloor.title')} body={t('emptyFloor.body')} />
  return (
    <PlanViewport width={size.width+80} height={size.height+80}>
      <div className="relative" style={{ minWidth: size.width + 40, minHeight: size.height + 40, width: '100%', height: '100%' }}>
        <div className="absolute" style={{ left: 40, top: 40, width: size.width, height: size.height }}>
          {background && <img src={background} alt="" className="absolute left-0 top-0 max-w-none object-contain object-left-top opacity-60 pointer-events-none" style={{left:plan?.backgroundSize?.x ?? 0,top:plan?.backgroundSize?.y ?? 0,width:plan?.backgroundSize?.width ?? 1200,height:plan?.backgroundSize?.height ?? 800}} />}
          {plan?.zones.map(z=><div key={z.id} className="absolute border-2 border-dashed rounded pointer-events-none" style={{left:z.x,top:z.y,width:z.width,height:z.height,borderColor:z.color,backgroundColor:z.color+'18'}}><span className="px-2 py-1 text-sm font-semibold" style={{color:z.color}}>{z.name}</span></div>)}
          {plan?.walls.map(w=><div key={w.id} className="absolute bg-slate-600 border border-slate-800 pointer-events-none" style={{left:w.x,top:w.y,width:w.width,height:w.height}}/>)}
          {views.map((v) => {
            const booking = reserved[v.table.id] ?? null
            const state = kitState(v.state, booking !== null)
            // Mover un pedido solo puede aterrizar en una mesa libre: una reservada tampoco vale.
            const pickable = !pickFree || state === 'available'
            const name = String(v.table.number)
            const pill = state === 'reserved' && booking ? { text: booking.label, icon: 'clock' as const } : pillFor(v.state, ts)
            const legend = state === 'reserved' ? t('legend.reserved') : t('legend.available')
            return (
              <TableShape key={v.table.id} rect={v.table} name={name} state={state} selected={v.table.id === selectedId} dimmed={(pickFree && !pickable) || (visibleIds != null && !visibleIds.includes(v.table.id))}
                code={codeFor ? codeFor(v) : v.orderId !== null ? orderCode('DI', null, v.orderId) : null} pill={pill ?? {text: `${v.table.seats} personas`,icon:'user'}}
                label={t('tableLabel', { name, state: state === 'unavailable' && pill ? pill.text : legend })}
                onClick={pickable ? () => onSelect(v.table.id) : undefined} className={cn(!pickable && 'pointer-events-none')} />
            )
          })}
        </div>
      </div>
    </PlanViewport>
  )
}
