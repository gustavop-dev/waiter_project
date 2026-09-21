'use client'

import { useEffect, useState, type ReactNode } from 'react'

import { FloorInfoChip } from '@/components/tables/FloorHeader'
import { FloorPlan } from '@/components/tables/FloorPlan'
import { FloorZones } from '@/components/tables/FloorZones'
import type { FloorDocument } from '@/lib/domain/floorPlan'
import type { TableView } from '@/lib/domain/tableState'
import { parseFloorName, remainingByTemplate } from '@/lib/domain/tablesKit'
import { readPlan } from '@/lib/services/floorPlan'
import type { TableReservation } from '@/lib/services/tables'
import type { Floor } from '@/lib/types'

// Un piso del salón con todo lo suyo: carga su plano, su barra de zonas, su chip de información y dibuja sus mesas.
// El salón monta uno (vista normal) o dos lado a lado (pantalla partida); cada panel es independiente salvo la mesa
// seleccionada, que es una sola en toda la pantalla. `refreshKey` cambia cuando el catálogo se recarga (p. ej. tras
// guardar el plano) y obliga a releerlo. `header` es la franja propia del panel en pantalla partida.
// Último plano leído de cada piso. Vive fuera del componente: al volver a Mesas (o cambiar de piso) el plano completo
// —paredes, zonas, imágenes— se pinta al instante y se relee detrás. Antes solo las mesas salían enseguida y el resto
// «saltaba» un momento después. El plano casi no cambia: al guardarlo en el editor, la carta se recarga (`refreshKey`)
// y se relee.
const planCache = new Map<number, FloorDocument>()

export function FloorPane({ floor, configId, views, reserved, selectedId, onSelect, pickFree, codeFor, refreshKey, header, children }: {
  floor: Floor; configId: number; views: TableView[]; reserved: Record<number, TableReservation | null>; selectedId: number | null
  onSelect: (id: number) => void; pickFree: boolean; codeFor: (view: TableView) => string | null; refreshKey: unknown
  header?: ReactNode; children?: ReactNode
}) {
  const [plan, setPlan] = useState<FloorDocument | null>(() => planCache.get(floor.id) ?? null)
  const [visibleIds, setVisibleIds] = useState<number[] | null>(null)
  const [zoneStaff, setZoneStaff] = useState<Record<string, string[]>>({})
  useEffect(() => {
    let alive = true
    void readPlan(floor.id).then((p) => { planCache.set(floor.id, p); if (alive) { setPlan(p); setVisibleIds(null) } }).catch(() => { if (alive) setPlan(null) })
    return () => { alive = false }
  }, [floor.id, refreshKey])
  const current = plan?.id === floor.id ? plan : planCache.get(floor.id) ?? null
  return (
    <section aria-label={parseFloorName(floor.name).label} className="relative flex-1 min-w-0 min-h-0 flex flex-col">
      {header}
      {current && <FloorZones key={floor.id} plan={current} floorName={parseFloorName(floor.name).label} configId={configId} onFilter={setVisibleIds} onStaff={setZoneStaff} />}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <FloorInfoChip type={parseFloorName(floor.name).type} remaining={remainingByTemplate(views.filter((v) => !reserved[v.table.id]))} />
        <FloorPlan plan={current} zoneStaff={zoneStaff} visibleIds={visibleIds} views={views} selectedId={selectedId} onSelect={onSelect} pickFree={pickFree} codeFor={codeFor} reserved={reserved}
          background={floor.hasBackground ? `/odoo/web/image/restaurant.floor/${floor.id}/floor_background_image?unique=${current?.revision ?? 0}` : null} />
        {children}
      </div>
    </section>
  )
}
