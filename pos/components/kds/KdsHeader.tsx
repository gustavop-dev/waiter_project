'use client'

import { useTranslations } from 'next-intl'

import { ALL, LATE, formatClock } from '@/lib/domain/kitchen'
import { cn } from '@/lib/utils'

interface KdsHeaderProps { tabs: string[]; counts: Record<string, number>; active: string; onTab: (tab: string) => void; avgSeconds: number | null; now: number }

export function KdsHeader({ tabs, counts, active, onTab, avgSeconds, now }: KdsHeaderProps) {
  const t = useTranslations('pos.kds')
  const label = (tab: string) => (tab === ALL ? t('tabs.all') : tab === LATE ? t('tabs.late') : tab)
  return (
    <header className="h-20 px-6 flex items-center gap-6 border-b border-kds-raised bg-kds-bg">
      <span className="h-[30px] px-2 rounded-sm bg-brand-500 grid place-items-center font-bold text-[17px] tracking-[-0.05em] text-ink">Wt.</span>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <nav aria-label={t('grid')} className="flex items-center gap-2 ml-4">
        {tabs.map((tab) => (
          <button key={tab} type="button" aria-pressed={tab === active} onClick={() => onTab(tab)}
            className={cn('h-tap-min px-4 rounded-md text-[15px] font-bold', tab === active ? 'bg-brand-500 text-ink' : 'bg-kds-surface text-sidebar-soft',
              tab === LATE && tab !== active && counts[LATE] > 0 && 'text-busy-soft')}>
            {label(tab)} <span className="font-mono tabular ml-1">{counts[tab] ?? 0}</span>
          </button>
        ))}
      </nav>
      <p className="ml-auto text-[15px] text-sidebar-soft">
        {t('avg')} <span className="font-mono tabular text-kds-ink text-lg ml-1">{avgSeconds === null ? t('avgNone') : formatClock(avgSeconds)}</span>
      </p>
      <time className="font-mono tabular text-[34px] font-medium leading-none" dateTime={new Date(now).toISOString()}>
        {new Date(now).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
      </time>
    </header>
  )
}
