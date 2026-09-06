'use client'

import { useTranslations } from 'next-intl'

import { formatCop } from '@/lib/domain/money'
import type { RoiMetrics } from '@/lib/domain/roi'
import { cn } from '@/lib/utils'

interface RoiBentoProps { current: RoiMetrics; history: { label: string; hoursPer100: number }[]; months: number; periodLabel: string; laborChange: number | null }

const card = 'rounded-[18px] bg-surface border border-border p-[22px] flex flex-col justify-between'
const eyebrow = 'text-[13px] tracking-[0.1em] uppercase text-ink-3 font-medium'
const fmt1 = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function RoiBento({ current, history, months, periodLabel, laborChange }: RoiBentoProps) {
  const t = useTranslations('pos.roi')
  const maxHours = Math.max(...history.map((h) => h.hoursPer100), 1)
  const sources = [
    { key: 'autonomous', amount: current.autonomousRevenue, color: 'bg-brand-500' },
    { key: 'hours', amount: current.laborSaving, color: 'bg-brand-300' },
    { key: 'upsell', amount: current.aiSales, color: 'bg-brand-100' },
    { key: 'errors', amount: 0, color: 'bg-muted' },
  ]
  const maxSource = Math.max(...sources.map((s) => s.amount), 1)
  return (
    <div className="flex-1 min-h-0 p-6 px-7 grid grid-cols-4 grid-rows-[auto_auto_auto] gap-[18px] overflow-y-auto">
      <div className="col-span-2 rounded-[18px] bg-sidebar text-sidebar-ink p-[26px] flex flex-col justify-between gap-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] tracking-[0.12em] uppercase text-dim font-medium">{t('hero')}</span>
          <span className="h-[30px] px-[11px] rounded-lg bg-[#123522] text-[#A9E0C0] text-sm font-medium grid place-items-center">{t('months', { n: months })}</span>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="font-mono tabular text-[92px] leading-[0.9] text-brand-500">{current.roi.toLocaleString('es-CO', { maximumFractionDigits: 1 })}×</span>
          <div className="flex flex-col leading-snug"><span className="text-[17px] text-sidebar-soft">{t('perHundred')}</span><span className="font-mono tabular text-[22px]">{t('value', { amount: formatCop(current.roi * 100000) })}</span></div>
        </div>
        <div className="flex gap-2.5" aria-hidden><span className="h-2 rounded-sm bg-brand-500" style={{ flex: Math.max(current.roi, 0.05) }} /><span className="h-2 rounded-sm bg-kds-raised" style={{ flex: 1 }} /></div>
      </div>
      <div className={card}>
        <span className={eyebrow}>{t('labor')}</span>
        <div className="flex flex-col gap-1.5"><span className="font-mono tabular text-[27px]">$ {formatCop(current.laborSaving)}</span><span className="text-[15px] text-soft leading-snug">{t('laborHint', { hours: Math.round(current.hoursSaved) })}</span></div>
        {laborChange !== null && <span className={cn('inline-flex w-fit items-center h-7 px-2.5 rounded-[7px] text-sm font-medium', laborChange >= 0 ? 'bg-free-soft text-free-ink' : 'bg-busy-soft text-busy-ink')}>{laborChange >= 0 ? '↑' : '↓'} {Math.abs(laborChange)}%</span>}
      </div>
      <div className={card}>
        <span className={eyebrow}>{t('aiSales')}</span>
        <div className="flex flex-col gap-1.5"><span className="font-mono tabular text-[27px]">$ {formatCop(current.aiSales)}</span><span className="text-[15px] text-soft leading-snug">{t('aiSalesHint')}</span></div>
        <span className="inline-flex w-fit items-center h-7 px-2.5 rounded-[7px] text-sm font-medium bg-muted text-soft">{t('unmeasured')}</span>
      </div>
      <div className={cn(card, 'col-span-2 gap-3.5')}>
        <div className="flex items-baseline justify-between"><span className="text-[17px] font-bold">{t('north')}</span><span className="text-sm text-ink-3">{t('northTag')}</span></div>
        <div className="flex-1 flex items-end gap-[18px] min-h-[120px]">
          {history.map((h, i) => {
            const last = i === history.length - 1
            return (
              <div key={h.label} className="flex-1 flex flex-col items-center gap-2">
                <span className={cn('font-mono tabular text-[22px]', last && 'text-brand-600 font-medium')}>{fmt1(h.hoursPer100)}</span>
                <div className={cn('w-full rounded-t-[10px]', last ? 'bg-brand-500' : i === 0 ? 'bg-border' : 'bg-border')} style={{ height: `${Math.max(8, (h.hoursPer100 / maxHours) * 74)}px` }} />
                <span className={cn('text-sm', last ? 'font-medium' : 'text-soft')}>{h.label}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className={card}>
        <span className={eyebrow}>{t('cost')}</span>
        <span className="font-mono tabular text-[26px]">$ {formatCop(current.cost)}</span>
        <span className="text-sm text-soft leading-snug">{t('costHint')}</span>
      </div>
      <div className={cn(card, 'bg-brand-50 border-primary/30')}>
        <span className={cn(eyebrow, 'text-brand-600')}>{t('net')}</span>
        <span className="font-mono tabular text-[26px]">{current.net >= 0 ? '+ ' : '− '}$ {formatCop(Math.abs(current.net))}</span>
        <span className="text-sm text-progress-ink leading-snug">{t('netHint')}</span>
      </div>
      <div className="col-span-4 rounded-[18px] bg-surface border border-border p-[22px] flex items-center gap-7">
        <div className="flex flex-col gap-1 min-w-[220px]"><span className="text-[17px] font-bold">{t('sources')}</span><span className="text-sm text-soft">{t('sourcesHint', { period: periodLabel })}</span></div>
        <div className="flex-1 flex flex-col gap-2.5">
          {sources.map((s) => (
            <div key={s.key} className="flex items-center gap-3.5">
              <span className="w-[190px] text-[15px] text-ink">{t(`source.${s.key}`)}</span>
              <span className={cn('h-[26px] rounded-md', s.color)} style={{ width: `${Math.max(2, (s.amount / maxSource) * 60)}%` }} aria-hidden />
              <span className="font-mono tabular text-[15px] text-soft">{s.amount > 0 ? formatCop(s.amount) : t('unmeasured')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
