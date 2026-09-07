'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { Button } from '@/components/ui/Button'
import { filterByTab, type Notification, type NotificationTab } from '@/lib/domain/notifications'
import { NoSupplierError, requestIngredients } from '@/lib/services/notifications'
import { useAuthStore } from '@/lib/stores/authStore'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { toast } from '@/lib/stores/toastStore'
import { cn } from '@/lib/utils'

const TABS: NotificationTab[] = ['all', 'inventory', 'kitchen']
const POLL_MS = 30_000
const bold = (chunks: React.ReactNode) => <b className="font-semibold text-ink">{chunks}</b>
const low = (chunks: React.ReactNode) => <span className="font-semibold text-danger-ink">▪{chunks}</span>

// Popover de la campana (Dashboard / Notification Expand.png): pestañas Todas / Inventario / Cocina,
// "Marcar todas como leídas", tarjetas "¡Stock bajo!" (con "Solicitar ingredientes") y "¡Plato listo para servir!".
// Sondea Odoo cada 30 s mientras haya sesión; el estado leído vive en el dispositivo (ver informe).
export function NotificationPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('notifications')
  const sessionId = useAuthStore((s) => s.session?.id ?? null)
  const items = useNotificationStore((s) => s.items)
  const read = useNotificationStore((s) => s.read)
  const refresh = useNotificationStore((s) => s.refresh)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const setRequested = useNotificationStore((s) => s.setRequested)
  const [tab, setTab] = useState<NotificationTab>('all')
  const [busy, setBusy] = useState<number | null>(null)

  useEffect(() => {
    if (!sessionId) return
    void refresh(sessionId)
    const id = setInterval(() => void refresh(sessionId), POLL_MS)
    return () => clearInterval(id)
  }, [sessionId, refresh])

  async function request(n: Notification) {
    if (!n.stock) return
    setBusy(n.stock.productId)
    try {
      await requestIngredients(n.stock)
      setRequested(n.stock.productId)
      toast({ title: t('lowStock.sent'), body: t('lowStock.sentBody', { name: n.stock.name }) })
    } catch (e) {
      toast({ title: e instanceof NoSupplierError ? t('lowStock.noSupplier', { name: n.stock.name }) : t('lowStock.request'), tone: 'danger' })
    } finally { setBusy(null) }
  }

  if (!open) return null
  const visible = filterByTab(items, tab)
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div role="dialog" aria-label={t('title')} className="absolute right-0 top-full mt-3 w-[480px] max-h-[630px] z-40 flex flex-col rounded-lg border border-border bg-surface shadow-2xl overflow-hidden">
        <header className="px-4 pt-4 flex items-center justify-between">
          <span className="text-[20px] font-semibold text-ink">{t('title')}</span>
          <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-primary"><Icon name="checks" size={20} />{t('markAllRead')}</button>
        </header>
        <div role="tablist" className="px-4 mt-2 flex gap-5 border-b border-border">
          {TABS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={cn('h-11 text-[17px] font-semibold border-b-2 -mb-px', tab === k ? 'text-primary border-primary' : 'text-soft border-transparent')}>{t(`tabs.${k}`)}</button>
          ))}
        </div>
        <ul className="flex-1 min-h-0 overflow-auto p-3 flex flex-col gap-3">
          {visible.length === 0 && <li className="py-10 text-center text-[15px] text-dim">{t('empty')}</li>}
          {visible.map((n) => (
            <li key={n.id} data-read={read.has(n.id)} className={cn('rounded-md p-4 flex gap-4', read.has(n.id) ? 'bg-surface border border-border' : 'bg-muted')}>
              <span className={cn('w-14 h-14 shrink-0 rounded-md border grid place-items-center', n.kind === 'inventory' ? 'bg-progress-soft border-progress/40 text-progress-ink' : 'bg-info-soft border-info/40 text-info-ink')}>
                <Icon name={n.kind === 'inventory' ? 'inventory' : 'chef'} size={26} />
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <p className="text-[16px] font-semibold text-ink">{n.kind === 'inventory' ? t('lowStock.title') : t('dishReady.title')}</p>
                <p className="text-[15px] text-soft leading-relaxed">
                  {n.stock ? t.rich('lowStock.body', { name: n.stock.name, b: bold, low }) : t.rich('dishReady.body', { dish: n.dish?.dish ?? '', table: n.dish?.table ?? '', b: bold })}
                </p>
                {n.stock && (n.stock.requested
                  ? <span className="mt-1 text-[15px] font-semibold text-dim">{t('lowStock.requested')}</span>
                  : <Button variant="primary" size="compact" className="mt-1 self-start" disabled={busy === n.stock.productId} onClick={() => void request(n)}>{t('lowStock.request')}</Button>)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
