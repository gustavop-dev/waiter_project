'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { useAutomationSubnav } from '@/components/layout/useAutomationSubnav'
import { RoiBento } from '@/components/roi/RoiBento'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { inRange, metrics, monthsOfUse, pctChange, periodRange, toOdooDate, type Period } from '@/lib/domain/roi'
import { listPaidOrders, type PaidOrder } from '@/lib/services/roi'
import { useCatalogStore } from '@/lib/stores/catalogStore'

const PERIODS: Period[] = ['week', 'month', 'year']
const HISTORY = 3

export default function AutomatizacionPage() {
  const t = useTranslations('pos.roi')
  const subnav = useAutomationSubnav('roi')
  const catalog = useCatalogStore((s) => s.catalog)
  const [period, setPeriod] = useState<Period>('month')
  // Clave del periodo con los datos: mientras no coincida, la pantalla carga (sin setState síncrono en el efecto).
  const [data, setData] = useState<{ key: Period; orders: PaidOrder[] } | null>(null)
  const now = useMemo(() => new Date(), [])
  const ranges = useMemo(() => Array.from({ length: HISTORY }, (_, i) => periodRange(period, now, HISTORY - 1 - i)), [period, now])

  useEffect(() => {
    void listPaidOrders(toOdooDate(ranges[0].start), toOdooDate(ranges[HISTORY - 1].end)).then((orders) => setData({ key: period, orders }))
  }, [ranges, period])
  const orders = data?.key === period ? data.orders : null

  if (!catalog) return null
  const s = catalog.settings
  const perRange = ranges.map((r) => metrics((orders ?? []).filter((o) => inRange(o, r)), s, r.days))
  const current = perRange[HISTORY - 1]
  const previous = perRange[HISTORY - 2]
  const history = ranges.map((r, i) => ({ label: r.label.replace(/ \d{4}$/, ''), hoursPer100: perRange[i].hoursPer100 }))
  return (
    <Shell mode="sidebar" active="automation" subnav={subnav}>
      <Topbar
        left={<div className="flex flex-col gap-0.5"><span className="text-[22px] font-bold">{t('title')}</span>
          <span className="text-[15px] text-soft">{t('subtitle', { period: ranges[HISTORY - 1].label, previous: s.roiStartDate ? ranges[HISTORY - 2].label : t('baseline') })}</span></div>}
        right={<><Segmented label={t('title')} options={PERIODS.map((p) => ({ value: p, label: t(`periods.${p}`) }))} value={period} onChange={setPeriod} />
          <Button disabled>{t('export')}</Button></>}
      />
      {orders === null ? <p className="p-7 text-soft" role="status">…</p>
        : <RoiBento current={current} history={history} months={monthsOfUse(s.roiStartDate, now)} periodLabel={ranges[HISTORY - 1].label} laborChange={pctChange(current.laborSaving, previous.laborSaving)} />}
    </Shell>
  )
}
