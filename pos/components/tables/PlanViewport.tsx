'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { Icon } from '@/components/kit/Icon'
import { salonZoom, type PlanRect } from '@/lib/domain/floorPlan'

const MIN = 0.2, MAX = 2

// Visor del salón. Encuadra el plano entero y lo centra al abrir, al cambiar de piso y al girar la tablet, igual que
// «Ver todo» en el editor: lo que el administrador dibujó es lo que el mesero ve, sin tener que desplazarse.
// Si alguien acerca o aleja a mano, el visor respeta ese zoom hasta que pulse «Ver todo» o cambie de piso.
// `bounds` son los límites de todo lo dibujado y `core` los de lo que se opera (sin la imagen): ver salonZoom.
// `inset` reserva espacio arriba para el chip flotante del piso.
export function PlanViewport({ children, bounds, core = bounds, inset = 0 }: { children: ReactNode; bounds: PlanRect; core?: PlanRect; inset?: number }) {
  const root = useRef<HTMLDivElement>(null)
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [view, setView] = useState({ width: 0, height: 0 })
  const [manual, setManual] = useState<number | null>(null)
  const key = `${bounds.x}:${bounds.y}:${bounds.width}:${bounds.height}`
  const [fittedKey, setFittedKey] = useState(key)
  if (fittedKey !== key) { setFittedKey(key); setManual(null) }

  useEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => setView({ width: el.clientWidth, height: el.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fitted = salonZoom(bounds, core, { width: view.width, height: Math.max(0, view.height - inset) })
  const zoom = manual ?? fitted
  const step = (factor: number) => setManual(Math.max(MIN, Math.min(MAX, zoom * factor)))
  return (
    <div className="relative flex-1 min-h-0 min-w-0">
      <div ref={root} data-testid="floor-plan" className="absolute inset-0 overflow-auto touch-pan-x touch-pan-y"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button') || e.pointerType === 'touch') return
          pan.current = { x: e.clientX, y: e.clientY, left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => { if (pan.current) { e.currentTarget.scrollLeft = pan.current.left - (e.clientX - pan.current.x); e.currentTarget.scrollTop = pan.current.top - (e.clientY - pan.current.y) } }}
        onPointerUp={() => { pan.current = null }} onPointerCancel={() => { pan.current = null }}>
        {/* margin:auto dentro de un flex centra cuando sobra espacio y no recorta el contenido cuando falta. */}
        <div className="flex min-w-full min-h-full" style={{ paddingTop: inset }}>
          <div className="m-auto shrink-0" style={{ width: bounds.width * zoom, height: bounds.height * zoom }}>
            <div className="relative origin-top-left" style={{ width: bounds.width, height: bounds.height, transform: `scale(${zoom})`, '--plan-zoom': zoom } as CSSProperties}>
              <div className="absolute" style={{ left: -bounds.x, top: -bounds.y }}>{children}</div>
            </div>
          </div>
        </div>
      </div>
      <div role="group" aria-label="Zoom del plano" className="absolute bottom-3 right-3 flex items-center rounded-md border border-border bg-surface shadow-lg text-[14px] text-ink">
        <button type="button" aria-label="Alejar plano" onClick={() => step(1 / 1.2)} className="w-11 h-11 grid place-items-center rounded-l-md hover:bg-muted"><Icon name="minus" size={18} /></button>
        <span className="w-14 text-center tabular font-semibold" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Acercar plano" onClick={() => step(1.2)} className="w-11 h-11 grid place-items-center hover:bg-muted"><Icon name="plus" size={18} /></button>
        <button type="button" onClick={() => { setManual(null); root.current?.scrollTo(0, 0) }} aria-pressed={manual === null} className="h-11 px-3 flex items-center gap-2 border-l border-border rounded-r-md font-semibold hover:bg-muted"><Icon name="expand" size={18} />Ver todo</button>
      </div>
    </div>
  )
}
