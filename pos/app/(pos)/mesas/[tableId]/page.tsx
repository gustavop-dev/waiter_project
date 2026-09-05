'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { Rail } from '@/components/layout/Rail'
import { Topbar } from '@/components/layout/Topbar'
import { CategoryChips } from '@/components/order/CategoryChips'
import { OrderPanel } from '@/components/order/OrderPanel'
import { ProductGrid } from '@/components/order/ProductGrid'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useOrderStore } from '@/lib/stores/orderStore'

export default function OrderPage() {
  const t = useTranslations('pos.order')
  const router = useRouter()
  const tableId = Number(useParams<{ tableId: string }>().tableId)
  const session = useAuthStore((s) => s.session)
  const catalog = useCatalogStore((s) => s.catalog)
  const order = useOrderStore()
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [selectedLine, setSelectedLine] = useState<string | null>(null)

  const table = catalog?.tables.find((x) => x.id === tableId)

  useEffect(() => {
    if (session && table && order.draft?.tableId !== tableId) order.start(session.id, tableId, table.seats)
  }, [session, table, tableId, order])

  const counts = useMemo(() => {
    const c: Record<number, number> = {}
    catalog?.products.forEach((p) => p.categoryIds.forEach((id) => { c[id] = (c[id] ?? 0) + 1 }))
    return c
  }, [catalog])
  const products = useMemo(() => (catalog?.products ?? []).filter((p) => categoryId === null || p.categoryIds.includes(categoryId)), [catalog, categoryId])

  function onNote(uuid: string) {
    const current = order.draft?.lines.find((l) => l.uuid === uuid)?.note ?? ''
    // Único diálogo con entrada de texto; sin diseño aún, se reemplaza cuando exista.
    const note = window.prompt(t('notePrompt'), current)
    if (note !== null) order.note(uuid, note.trim())
  }
  async function onSend() { await order.sendToKitchen(); if (!useOrderStore.getState().error) router.push('/salon') }
  async function onBill() { await order.requestBill(); if (!useOrderStore.getState().error) router.push('/salon') }

  if (!catalog || !table || !order.draft) return null
  return (
    <div className="h-screen flex bg-canvas">
      <Rail active="tables" userName={useAuthStore.getState().user?.name ?? ''} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          left={<><Button size="compact" onClick={() => router.push('/salon')}>← {t('back')}</Button><span className="text-[22px] font-bold">{t('header', { number: table.number })}</span><span className="text-[15px] text-soft">{t('meta', { pax: table.seats, ref: order.saved?.reference ?? '—' })}</span></>}
          right={<><Button size="compact" disabled>{t('search')}</Button><Button size="compact" disabled>{t('kitchenNote')}</Button></>}
        />
        {order.error && <p role="alert" className="mx-6 mt-3 px-4 py-3 rounded-md bg-busy-soft text-busy-ink text-[15px]">{order.error}</p>}
        <div className="flex-1 min-h-0 flex">
          <section aria-label={t('menu')} className="flex-1 min-w-0 flex flex-col">
            <CategoryChips categories={catalog.categories} counts={counts} soldOut={catalog.products.filter((p) => p.soldOut).length} activeId={categoryId} onChange={setCategoryId} />
            <ProductGrid products={products} onAdd={order.add} />
          </section>
          <OrderPanel tableNumber={table.number} lines={order.draft.lines} selectedUuid={selectedLine} busy={order.busy}
            onSelectLine={setSelectedLine} onQty={order.changeQty} onNote={onNote} onRemove={(u) => { order.remove(u); setSelectedLine(null) }}
            onSave={order.save} onBill={onBill} onSend={onSend} />
        </div>
      </div>
    </div>
  )
}
