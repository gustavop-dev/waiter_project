'use client'

import { useTranslations } from 'next-intl'

import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { TableShape, type TablePill } from '@/components/tables/TableShape'
import type { TableState, TableView } from '@/lib/domain/tableState'
import { kitState, orderCode, planSize } from '@/lib/domain/tablesKit'
import { cn } from '@/lib/utils'

interface Props { views: TableView[]; selectedId: number | null; onSelect: (id: number) => void; background?: string | null; pickFree?: boolean; codeFor?: (view: TableView) => string | null }

// Estado bajo la mesa, en las palabras del kit. Los estados que el kit no dibuja (asistencia, cuenta pedida…) van con
// la misma píldora naranja y su propio texto: son reales y el mesero los necesita.
export function pillFor(state: TableState, t: (key: string) => string): TablePill | null {
  if (state === 'free') return null
  if (state === 'served') return { text: t('served'), icon: 'check' }
  if (state === 'billing') return { text: t('billing'), icon: 'receipt' }
  if (state === 'assist') return { text: t('assist'), icon: 'bell' }
  if (state === 'ordering') return { text: t('ordering'), icon: 'cart' }
  if (state === 'closed') return { text: t('closed'), icon: 'lock' }
  if (state === 'paid') return { text: t('paid'), icon: 'check' }
  return { text: t('inProgress'), icon: 'alarm' }
}

// Plano real del piso (posición y tamaño de restaurant.table) con scroll horizontal, como en el kit.
export function FloorPlan({ views, selectedId, onSelect, background = null, pickFree = false, codeFor }: Props) {
  const t = useTranslations('tables')
  const ts = useTranslations('tables.state')
  const size = planSize(views.map((v) => v.table))
  if (views.length === 0) return <KitEmptyState icon="tables" title={t('emptyFloor.title')} body={t('emptyFloor.body')} />
  return (
    <div className="flex-1 min-h-0 overflow-auto" data-testid="floor-plan">
      <div className="relative" style={{ minWidth: size.width + 40, minHeight: size.height + 40, width: '100%', height: '100%' }}>
        {background && <img src={background} alt="" className="absolute inset-0 w-full h-full object-contain object-left-top opacity-60 pointer-events-none" />}
        <div className="absolute" style={{ left: 40, top: 40 }}>
          {views.map((v) => {
            const state = kitState(v.state)
            const pickable = !pickFree || state === 'available'
            const name = String(v.table.number)
            const pill = pillFor(v.state, ts)
            return (
              <TableShape key={v.table.id} rect={v.table} name={name} state={state} selected={v.table.id === selectedId} dimmed={pickFree && !pickable}
                code={codeFor ? codeFor(v) : v.orderId !== null ? orderCode('DI', null, v.orderId) : null} pill={pill}
                label={t('tableLabel', { name, state: pill?.text ?? t('legend.available') })} onClick={pickable ? () => onSelect(v.table.id) : undefined} className={cn(!pickable && 'pointer-events-none')} />
            )
          })}
        </div>
      </div>
    </div>
  )
}
