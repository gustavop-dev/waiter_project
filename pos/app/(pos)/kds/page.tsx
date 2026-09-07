'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { KdsFooter } from '@/components/kds/KdsFooter'
import { KdsHeader } from '@/components/kds/KdsHeader'
import { ReadyList } from '@/components/kds/ReadyList'
import { TicketCard } from '@/components/kds/TicketCard'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { ALL, LATE, averagePrepSeconds, countTickets, filterTickets, stations } from '@/lib/domain/kitchen'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useKitchenStore } from '@/lib/stores/kitchenStore'

const POLL_MS = 5_000

// Pantalla fija de cocina en modo oscuro del kit (data-theme="dark" propio, independiente del tema del usuario):
// sondea Odoo cada 5 s, cronómetros cada segundo. Sin barra superior: la cocina es un dispositivo, no un mesero.
export default function KdsPage() {
  const t = useTranslations('kds')
  const session = useAuthStore((s) => s.session)
  const catalog = useCatalogStore((s) => s.catalog)
  const { tickets, done, tab, muted, refresh, ready, serve, setTab, toggleMute, tick } = useKitchenStore()
  const [now, setNow] = useState(() => Date.now())

  // Estación de un producto: la de la primera categoría suya que tenga una.
  const stationOf = useMemo(() => {
    const byCategory = new Map((catalog?.categories ?? []).map((c) => [c.id, c.station]))
    const byProduct = new Map((catalog?.products ?? []).map((p) => [p.id, p.categoryIds]))
    return (productId: number) => (byProduct.get(productId) ?? []).map((id) => byCategory.get(id) ?? null).find((s) => s !== null) ?? null
  }, [catalog])

  useEffect(() => {
    if (!session || !catalog) return
    void refresh(session.id, stationOf)
    const id = setInterval(() => void refresh(session.id, stationOf), POLL_MS)
    return () => clearInterval(id)
  }, [session, catalog, stationOf, refresh])
  useEffect(() => { const id = setInterval(() => { const n = Date.now(); setNow(n); tick(n) }, 1_000); return () => clearInterval(id) }, [tick])

  if (!session || !catalog) return null
  const tableNumberOf = (tableId: number) => catalog.tables.find((tb) => tb.id === tableId)?.number ?? tableId
  const cooking = tickets.filter((tk) => tk.readyAt === null)
  const readyOnes = tickets.filter((tk) => tk.readyAt !== null)
  const visible = filterTickets(cooking, tab, now)
  return (
    <main data-theme="dark" className="h-screen flex flex-col bg-canvas text-ink">
      <KdsHeader tabs={[ALL, ...stations(cooking), LATE]} counts={countTickets(cooking, now)} active={tab} onTab={setTab} avgSeconds={averagePrepSeconds(done)} now={now} />
      <div className="flex flex-1 min-h-0 gap-5 p-5">
        <section aria-label={t('grid')} className="flex-1 min-w-0 overflow-y-auto grid grid-cols-3 auto-rows-min content-start gap-5">
          {visible.length === 0 && <div className="col-span-3 flex"><KitEmptyState icon="chef" title={t('empty')} body={t('emptyBody')} /></div>}
          {visible.map((tk) => <TicketCard key={tk.id} ticket={tk} tableNumber={tableNumberOf(tk.tableId)} now={now} onReady={(id) => void ready(id, session.id, stationOf)} />)}
        </section>
        <ReadyList tickets={readyOnes} tableNumberOf={tableNumberOf} now={now} onServed={(id) => void serve(id, session.id, stationOf)} />
      </div>
      <KdsFooter muted={muted} onToggleMute={toggleMute} />
    </main>
  )
}
