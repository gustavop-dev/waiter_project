import type { ReactNode } from 'react'

import { Rail } from '@/components/layout/Rail'
import { Sidebar } from '@/components/layout/Sidebar'

export function Shell({ mode, children }: { mode: 'sidebar' | 'rail'; children: ReactNode }) {
  return (
    <div className="h-screen flex bg-canvas">
      {mode === 'sidebar' ? <Sidebar active="operation" /> : <Rail active="tables" />}
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  )
}
