'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { initials } from '@/components/layout/Sidebar'
import { cn } from '@/lib/utils'

import { can, type Role } from '@/lib/domain/roles'

export function Rail({ active, userName = '', role = 'admin' }: { active: 'tables' | 'orders' | 'kitchen' | 'payments'; userName?: string; role?: Role }) {
  const t = useTranslations('pos.rail')
  const items = ([['tables', '/salon'], ['orders', '/operacion'], ['kitchen', '/kds'], ['payments', '/ventas']] as const).filter(([key]) => key !== 'payments' || can.closeRegister(role))
  return (
    <aside className="w-rail shrink-0 bg-sidebar p-3 flex flex-col items-center gap-3">
      <span className="h-[30px] px-2 rounded-sm bg-brand-500 grid place-items-center font-bold text-[17px] tracking-[-0.05em] text-ink">Wt.</span>
      <nav className="w-full flex flex-col gap-1.5 mt-2">
        {items.map(([key, href]) => {
          const cls = cn('h-16 rounded-md grid place-items-center text-[13px] text-center leading-tight', key === active ? 'bg-brand-500 text-ink font-bold' : 'text-sidebar-soft')
          return href ? <Link key={key} href={href} className={cls}>{t(key)}</Link> : <span key={key} className={cn(cls, 'opacity-60')}>{t(key)}</span>
        })}
      </nav>
      {userName && <span className="mt-auto w-10 h-10 rounded-full bg-kds-raised text-sidebar-ink grid place-items-center text-sm font-medium">{initials(userName)}</span>}
    </aside>
  )
}
