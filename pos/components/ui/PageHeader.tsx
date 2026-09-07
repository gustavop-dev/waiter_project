import type { ReactNode } from 'react'

import { Icon, type KitIcon } from '@/components/kit/Icon'

// Fila de título del kit (Order / Ipad View.png, Inventory / Home.png): chip de título con icono a la izquierda,
// chips de sección a continuación y las acciones (buscador, botón primario) a la derecha.
export function PageHeader({ icon, title, children, actions }: { icon: KitIcon; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="shrink-0 h-[72px] px-5 flex items-center gap-4">
      <h1 className="h-12 px-4 rounded-md bg-muted flex items-center gap-2 text-[18px] font-semibold text-ink whitespace-nowrap">
        <Icon name={icon} size={22} /><span>{title}</span>
      </h1>
      {children && <div className="flex items-center gap-2 min-w-0">{children}</div>}
      {actions && <div className="ml-auto flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  )
}
