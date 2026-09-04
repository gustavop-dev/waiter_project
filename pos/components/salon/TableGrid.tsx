'use client'

import { TableCell } from '@/components/salon/TableCell'
import type { TableView } from '@/lib/domain/tableState'

export function TableGrid({ views, selectedId, onSelect }: { views: TableView[]; selectedId: number | null; onSelect: (id: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-4.5 content-start p-1.5">
      {views.map((v) => <TableCell key={v.table.id} view={v} selected={v.table.id === selectedId} onSelect={onSelect} />)}
    </div>
  )
}
