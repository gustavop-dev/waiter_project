'use client'

import type { CSSProperties, ReactNode } from 'react'

import { Icon, type KitIcon } from '@/components/kit/Icon'
import { chairsFor, templateFor, type KitTableState, type Rect } from '@/lib/domain/tablesKit'
import { cn } from '@/lib/utils'

// `tone: 'success'` es para "Listo para servir": el mesero tiene que reconocer esas mesas de un vistazo
// desde el otro lado del salón, y el naranja de "en progreso" no las distingue.
export interface TablePill { text: string; icon: KitIcon; tone?: 'success' }
interface Props {
  rect: Rect; name: string; state: KitTableState; code?: string | null; pill?: TablePill | null; selected?: boolean; dimmed?: boolean
  label: string; onClick?: () => void; onPointerDown?: (e: React.PointerEvent) => void; children?: ReactNode; className?: string; style?: CSSProperties
  // inert: solo dibujo (miniatura de la paleta, fantasma al arrastrar), sin botón dentro de otro botón.
  inert?: boolean
}

const BOX: Record<KitTableState, string> = {
  available: 'bg-surface border border-border text-ink', unavailable: 'bg-progress text-progress-ink', reserved: 'bg-reserved text-reserved-ink',
}
// Las sillas de una mesa libre son gris claro macizo (en el kit se ven sobre el lienzo, no se pierden en él).
const CHAIR: Record<KitTableState, string> = { available: 'bg-muted', unavailable: 'bg-progress', reserved: 'bg-reserved' }
const CHIP: Record<KitTableState, string> = { available: 'bg-muted text-ink', unavailable: 'bg-progress-soft text-progress-ink', reserved: 'bg-muted text-ink' }
const PILL: Record<KitTableState, string> = { available: 'bg-muted text-ink', unavailable: 'bg-progress-soft text-progress-ink', reserved: 'bg-surface text-ink' }
const CHAIR_THICK = 10
const CHAIR_GAP = 6

// Sillas fuera de la caja, repartidas por lado según la plantilla del kit (pequeña 1+1+1+1, apaisada 3+3+1+1, vertical 1+1+3+3).
function chairs(rect: Rect, state: KitTableState) {
  const c = chairsFor(templateFor(rect))
  const along = (n: number, size: number) => Array.from({ length: n }, (_, i) => ({ center: ((i + 1) / (n + 1)) * size, len: Math.min(56, size / (n + 1) - 8) }))
  const out: { style: CSSProperties; key: string }[] = []
  along(c.top, rect.width).forEach((p, i) => out.push({ key: `t${i}`, style: { left: p.center - p.len / 2, top: -CHAIR_GAP - CHAIR_THICK, width: p.len, height: CHAIR_THICK } }))
  along(c.bottom, rect.width).forEach((p, i) => out.push({ key: `b${i}`, style: { left: p.center - p.len / 2, bottom: -CHAIR_GAP - CHAIR_THICK, width: p.len, height: CHAIR_THICK } }))
  along(c.left, rect.height).forEach((p, i) => out.push({ key: `l${i}`, style: { top: p.center - p.len / 2, left: -CHAIR_GAP - CHAIR_THICK, width: CHAIR_THICK, height: p.len } }))
  along(c.right, rect.height).forEach((p, i) => out.push({ key: `r${i}`, style: { top: p.center - p.len / 2, right: -CHAIR_GAP - CHAIR_THICK, width: CHAIR_THICK, height: p.len } }))
  return out.map((x) => <span key={x.key} aria-hidden className={cn('absolute rounded-full', CHAIR[state])} style={x.style} />)
}

// Mesa del plano del kit (6 – Table / Home.png): caja redondeada con sillas, nombre en círculo cuando está
// disponible, chip nombre + Order# arriba y píldora de estado abajo cuando no lo está.
export function TableShape({ rect, name, state, code = null, pill = null, selected = false, dimmed = false, label, onClick, onPointerDown, children, className, style, inert = false }: Props) {
  const busy = state !== 'available'
  const interactive = Boolean(onClick || onPointerDown)
  const boxClass = cn('relative block w-full h-full rounded-[18px] text-left transition-shadow', BOX[state], interactive && 'cursor-pointer', onPointerDown && 'touch-none')
  const body = (
    <>
      {busy ? (
        <span className={cn('absolute top-2 left-2 flex items-center gap-2 h-7 px-2.5 rounded-full text-[13px] font-semibold', CHIP[state], code ? 'right-2 justify-between' : '')}>
          <span>{name}</span>{code && <span>{code}</span>}
        </span>
      ) : name !== '' && (
        <span className="absolute inset-0 grid place-items-center"><span className="w-11 h-11 rounded-full bg-muted grid place-items-center text-[16px] font-semibold text-ink">{name}</span></span>
      )}
      {pill && (
        <span className={cn('absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[13px] font-semibold whitespace-nowrap',
          pill.tone === 'success' ? 'bg-success text-white' : PILL[state])}>
          <Icon name={pill.icon} size={14} />{pill.text}
        </span>
      )}
    </>
  )
  return (
    <div className={cn('absolute', dimmed && 'opacity-40', className)} style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, ...style }} data-table={name}>
      {selected && <span aria-hidden className="absolute -inset-5 rounded-lg bg-primary-soft border border-primary" />}
      {chairs(rect, state)}
      {inert ? <span aria-hidden className={boxClass}>{body}</span> : (
        <button type="button" aria-label={label} aria-pressed={selected} onClick={onClick} onPointerDown={onPointerDown} disabled={!interactive} className={boxClass}>{body}</button>
      )}
      {children}
    </div>
  )
}
