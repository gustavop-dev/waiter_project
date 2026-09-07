'use client'

import { useTranslations } from 'next-intl'

import { Icon, type KitIcon } from '@/components/kit/Icon'
import { cn } from '@/lib/utils'

const TAB_ICONS: KitIcon[] = ['dashboard', 'orders', 'tables', 'reservations', 'history']
const KPI_ICONS: KitIcon[] = ['card', 'alarm', 'check']

const Bar = ({ className }: { className?: string }) => <span className={cn('block h-2.5 rounded-full bg-muted', className)} />

// Marco decorativo del login (Select Employee.png): la tablet con el Inicio del kit dibujada con los
// componentes del sistema, sin cifras inventadas (las tarjetas llevan barras en vez de pedidos falsos).
export function DashboardMockup() {
  const t = useTranslations('account.mockup')
  const tabs = t.raw('tabs') as string[]
  const kpis = t.raw('kpis') as string[]
  const columns = t.raw('columns') as string[]
  return (
    <div aria-hidden className="h-full w-full rounded-tl-[28px] border-t border-l border-border bg-muted/60 pt-20 pl-10 overflow-hidden">
      <div className="h-full rounded-tl-xl bg-canvas border-t border-l border-border flex flex-col overflow-hidden">
        <header className="h-16 px-4 flex items-center gap-3 bg-surface border-b border-border">
          <span className="w-8 h-8 rounded-md bg-primary text-primary-ink grid place-items-center text-[13px] font-semibold">W</span>
          <nav className="flex items-center gap-0.5 p-1 rounded-lg bg-muted whitespace-nowrap">
            {tabs.map((tab, i) => (
              <span key={tab} className={cn('flex items-center gap-1.5 h-9 px-2.5 rounded-md text-[14px] font-semibold', i === 0 ? 'bg-surface border border-border text-ink' : 'text-dim')}>
                <Icon name={TAB_ICONS[i]} size={18} /><span>{tab}</span>
              </span>
            ))}
          </nav>
        </header>
        <div className="p-4 flex flex-col gap-4 min-h-0">
          <div><p className="text-[17px] font-semibold text-ink">{t('greeting')}</p><p className="text-[13px] text-soft">{t('motto')}</p></div>
          <div className="flex gap-3 whitespace-nowrap">
            {kpis.map((k, i) => (
              <div key={k} className="w-[180px] shrink-0 rounded-lg bg-surface border border-border p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[13px] text-soft"><span>{k}</span><span className="w-7 h-7 rounded-md bg-primary-soft text-primary grid place-items-center"><Icon name={KPI_ICONS[i]} size={16} /></span></div>
                <Bar className="w-16 h-4" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 min-h-0">
            {columns.map((col) => (
              <section key={col} className="w-[370px] shrink-0 rounded-lg bg-surface border border-border flex flex-col">
                <h3 className="h-12 px-4 flex items-center text-[15px] font-semibold text-ink border-b border-border">{col}</h3>
                <div className="p-3 flex flex-col gap-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="rounded-md border border-border p-3 flex flex-col gap-3">
                      <div className="h-8 rounded-sm bg-muted" />
                      <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-md bg-primary" /><div className="flex-1 flex flex-col gap-2"><Bar className="w-24" /><Bar className="w-16" /></div></div>
                      <div className="h-9 rounded-md bg-progress-soft" />
                    </div>
                  ))}
                </div>
                <div className="mt-auto h-11 px-4 border-t border-border flex items-center justify-center gap-1 text-[13px] font-semibold text-ink">{t('seeAll')}<Icon name="chevronRight" size={14} /></div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
