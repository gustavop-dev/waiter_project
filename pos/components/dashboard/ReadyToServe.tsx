'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { Button } from '@/components/ui/Button'
import { elapsedSeconds } from '@/lib/domain/kitchen'
import type { ReadyDish } from '@/lib/domain/orderState'

// Minutos que el plato lleva esperando en el pase; por debajo de uno, "ahora".
function waited(since: string, now: number): number {
  return Math.max(0, Math.floor(elapsedSeconds(since, now) / 60))
}

// Panel "Listos para servir": lo que cocina ya dejó en el pase y nadie ha llevado a la mesa. Es la lista de
// trabajo del mesero — el plato que lleva más esperando va primero — y el único sitio donde se marca "Entregado".
export function ReadyToServe({ dishes, onServe, onServeAll, busy }: { dishes: ReadyDish[]; onServe: (dish: ReadyDish) => void; onServeAll: () => void; busy: boolean }) {
  const t = useTranslations('dashboard.ready')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])

  return (
    <section aria-label={t('title')} className="bg-surface border border-border rounded-lg flex flex-col min-h-0 min-w-0">
      <header className="px-4 h-16 flex items-center gap-2 border-b border-border shrink-0">
        <span className="w-9 h-9 rounded-md bg-success-soft text-success-ink grid place-items-center"><Icon name="chef" size={20} /></span>
        <h2 className="min-w-0 truncate text-[16px] font-semibold text-ink">{t('title')}</h2>
        {dishes.length > 0 && <span className="ml-auto h-7 min-w-7 px-2 rounded-full bg-success text-white grid place-items-center text-[13px] font-bold tabular">{dishes.length}</span>}
      </header>
      {dishes.length > 1 && (
        <div className="px-3 pt-3">
          <Button size="compact" className="w-full" disabled={busy} onClick={onServeAll}><Icon name="checks" size={18} />{t('deliverAll')}</Button>
        </div>
      )}
      <ul className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
        {dishes.length === 0 && (
          <li className="flex-1 grid place-items-center py-6 text-center">
            <span className="flex flex-col items-center gap-1.5 text-dim"><Icon name="check" size={26} /><span className="text-[14px]">{t('empty')}</span></span>
          </li>
        )}
        {dishes.map((d) => {
          const minutes = waited(d.since, now)
          return (
            <li key={d.lineId} className="rounded-md border border-success/40 bg-success-soft p-3 flex flex-col gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                {d.tableNumber !== null
                  ? <span aria-label={t('table', { n: d.tableNumber })} className="w-9 h-9 shrink-0 rounded-md bg-primary text-primary-ink grid place-items-center text-[15px] font-semibold">{d.tableNumber}</span>
                  : <span aria-hidden className="w-9 h-9 shrink-0 rounded-md bg-muted text-soft grid place-items-center"><Icon name="bag" size={18} /></span>}
                <div className="min-w-0 flex-1 flex flex-col">
                  <span className="text-[15px] font-semibold text-ink truncate">{d.qty > 1 && <span className="tabular">{d.qty}× </span>}{d.name}</span>
                  <span className="text-[13px] text-soft truncate">
                    <span className="font-semibold text-success-ink tabular">{minutes < 1 ? t('justNow') : t('minutes', { n: minutes })}</span>
                    {' · '}{d.orderNumber}{d.customer && ` · ${d.customer}`}
                  </span>
                </div>
              </div>
              <Button variant="primary" size="compact" disabled={busy} onClick={() => onServe(d)}><Icon name="check" size={18} />{t('deliver')}</Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
