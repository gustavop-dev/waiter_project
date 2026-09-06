'use client'

import type { ReactNode } from 'react'

import { KitShell } from '@/components/kit/KitShell'
import type { Autonomy, NavBadge, NavItem, SubNavItem } from '@/components/layout/Sidebar'

// Compatibilidad: las pantallas anteriores a la oleada I.1 siguen llamando a Shell; todo se pinta con el armazón del kit.
// Los badges, la subnavegación y la autonomía del sidebar vuelven en la oleada I.7 dentro de cada pantalla rediseñada.
interface ShellProps { mode: 'sidebar' | 'rail'; active?: NavItem; children: ReactNode; badges?: Partial<Record<NavItem, NavBadge>>; subnav?: { label: string; items: SubNavItem[] }; autonomy?: Autonomy | null }

export function Shell({ children }: ShellProps) {
  return <KitShell>{children}</KitShell>
}
