'use client'

import type { Floor } from '@/lib/types'
import { cn } from '@/lib/utils'

export function FloorTabs({ floors, activeId, onChange }: { floors: Floor[]; activeId: number | null; onChange: (id: number) => void }) {
  return (
    <div role="tablist" className="inline-flex gap-1 p-1 bg-muted rounded-md">
      {floors.map((f) => (
        <button key={f.id} type="button" role="tab" aria-selected={f.id === activeId} onClick={() => onChange(f.id)}
          className={cn('px-4.5 py-2.75 rounded-[9px] text-[15px] min-h-tap-min', f.id === activeId ? 'bg-surface font-semibold shadow-sm' : 'text-soft')}>
          {f.name}
        </button>
      ))}
    </div>
  )
}
