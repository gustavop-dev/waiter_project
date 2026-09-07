'use client'

import { useTranslations } from 'next-intl'

import { Chip } from '@/components/kit/Chip'
import { Icon } from '@/components/kit/Icon'
import { ALL, LATE, formatClock } from '@/lib/domain/kitchen'

interface KdsHeaderProps { tabs: string[]; counts: Record<string, number>; active: string; onTab: (tab: string) => void; avgSeconds: number | null; now: number }

// Cabecera del kit para la pantalla de cocina: logo, chip de título, chips de estación con conteo, tiempo medio y reloj.
// No lleva la barra de pestañas: la cocina es un dispositivo fijo, no un mesero.
export function KdsHeader({ tabs, counts, active, onTab, avgSeconds, now }: KdsHeaderProps) {
  const t = useTranslations('kds')
  const label = (tab: string) => (tab === ALL ? t('tabs.all') : tab === LATE ? t('tabs.late') : tab)
  return (
    <header className="shrink-0 bg-surface border-b border-border">
      <div className="h-topbar px-5 flex items-center gap-4">
        <span aria-label="Waiter" className="w-9 h-9 rounded-md bg-primary text-primary-ink grid place-items-center font-semibold">W</span>
        <h1 className="h-12 px-4 rounded-md bg-muted flex items-center gap-2 text-[18px] font-semibold text-ink whitespace-nowrap"><Icon name="chef" size={22} />{t('title')}</h1>
        <nav aria-label={t('grid')} className="min-w-0 flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => <Chip key={tab} label={label(tab)} count={counts[tab] ?? 0} active={tab === active} onClick={() => onTab(tab)} icon={tab === LATE ? 'alarm' : undefined} />)}
        </nav>
        <div className="ml-auto shrink-0 flex items-center gap-5">
          <p className="text-[14px] text-soft flex items-baseline gap-2">{t('avg')}<span className="font-mono tabular text-[20px] font-semibold text-ink">{avgSeconds === null ? t('avgNone') : formatClock(avgSeconds)}</span></p>
          <time className="font-mono tabular text-[30px] font-semibold leading-none text-ink" dateTime={new Date(now).toISOString()}>
            {new Date(now).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </time>
        </div>
      </div>
    </header>
  )
}
