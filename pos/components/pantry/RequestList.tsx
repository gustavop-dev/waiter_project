'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { StatusPill, type PillTone } from '@/components/kit/StatusPill'
import { formatQty, unitDisplayName } from '@/lib/domain/pantry'
import type { PurchaseRequest } from '@/lib/services/pantry'

const TONE: Record<string, PillTone> = { draft: 'progress', sent: 'info', 'to approve': 'info', purchase: 'success', done: 'success', cancel: 'neutral' }
const dateFormat = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
// Odoo devuelve fechas UTC sin zona ("2026-09-06 14:03:11"): se leen como UTC y se muestran en la hora local.
export const formatDate = (s: string) => dateFormat.format(new Date(s.replace(' ', 'T') + 'Z'))

// Pestaña "Request List" (sin captura en el kit): sigue la fila de Ingredientes con PROVEEDOR · FECHA · ESTADO.
export function RequestList({ requests, query }: { requests: PurchaseRequest[]; query: string }) {
  const t = useTranslations('pantry.requests')
  const q = query.trim().toLocaleLowerCase('es')
  const rows = requests.filter((r) => q === '' || r.lines.some((l) => l.product.toLocaleLowerCase('es').includes(q)) || r.supplierName.toLocaleLowerCase('es').includes(q) || r.name.toLocaleLowerCase('es').includes(q))
  if (rows.length === 0) return <KitEmptyState icon="delivery" title={t('empty')} body={t('emptyBody')} />
  return (
    <ul className="p-2.5 flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.id} className="min-h-[72px] px-3 py-2 rounded-md border border-border bg-surface flex items-center gap-3">
          <span className="w-12 h-12 shrink-0 rounded-sm bg-muted grid place-items-center text-soft"><Icon name="catalog" size={22} /></span>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <p className="text-[15px] font-semibold text-ink truncate">{r.lines.map((l) => l.product).join(', ') || r.name}</p>
            <p className="text-[13px] text-soft truncate">{r.name}<span aria-hidden> • </span>{t('quantity')}: {r.lines.map((l) => `${formatQty(l.qty)} ${unitDisplayName(l.uomName)}`).join(', ')}</p>
          </div>
          <span className="w-px h-10 bg-border" aria-hidden />
          <div className="w-[190px] flex flex-col gap-1"><span className="text-[12px] font-medium text-dim tracking-wide">{t('supplier')}</span><span className="text-[15px] font-semibold text-ink truncate">{r.supplierName}</span></div>
          <div className="w-[170px] flex flex-col gap-1"><span className="text-[12px] font-medium text-dim tracking-wide">{t('date')}</span><span className="text-[14px] font-medium text-ink">{formatDate(r.date)}</span></div>
          <div className="w-[120px] flex flex-col gap-1 items-start"><span className="text-[12px] font-medium text-dim tracking-wide">{t('status')}</span><StatusPill tone={TONE[r.state] ?? 'neutral'} className="h-6 px-2 text-[13px]">{t(`states.${r.state}`)}</StatusPill></div>
        </li>
      ))}
    </ul>
  )
}
