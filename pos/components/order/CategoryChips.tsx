'use client'

import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props { categories: Category[]; counts: Record<number, number>; activeId: number | null; onChange: (id: number | null) => void }

export function CategoryChips({ categories, counts, activeId, onChange }: Props) {
  return (
    <div className="px-6 pt-4.5 pb-3.5 flex gap-2 flex-wrap border-b border-muted">
      {categories.map((c) => (
        <button key={c.id} type="button" onClick={() => onChange(c.id === activeId ? null : c.id)}
          className={cn('h-tap-min px-4.5 rounded-full text-base grid place-items-center', c.id === activeId ? 'bg-brand-500 text-white font-semibold' : 'bg-surface border border-border')}>
          {c.name} {counts[c.id] ?? 0}
        </button>
      ))}
    </div>
  )
}
