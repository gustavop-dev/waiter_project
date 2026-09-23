import type { ReactNode } from 'react'

export function Topbar({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <header className="h-[76px] shrink-0 px-7 flex items-center justify-between border-b border-border ambient-panel">
      <div className="flex items-center gap-3.5">{left}</div>
      <div className="flex items-center gap-2.5">{right}</div>
    </header>
  )
}
