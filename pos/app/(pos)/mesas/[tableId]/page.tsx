'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { Topbar } from '@/components/layout/Topbar'
import { CategoryChips } from '@/components/order/CategoryChips'
import { OrderPanel } from '@/components/order/OrderPanel'
import { ProductGrid } from '@/components/order/ProductGrid'
import { Button } from '@/components/ui/Button'
import { NoteDialog } from '@/components/ui/NoteDialog'
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
  const [query, setQuery] = useState('')
  const [noteFor, setNoteFor] = useState<{ uuid: string } | { order: true } | null>(null)

  const table = catalog?.tables.find((x) => x.id === tableId)

  useEffect(() => {
    if (session && table && order.draft?.tableId !== tableId) order.start(session.id, tableId, table.seats)
  }, [session, table, tableId, order])

  const counts = useMemo(() => {
    const c: Record<number, number> = {}
    catalog?.products.forEach((p) => p.categoryIds.forEach((id) => { c[id] = (c[id] ?? 0) + 1 }))
    return c
  }, [catalog])
  const products = useMemo(() => (catalog?.products ?? []).filter((p) => (categoryId === null || p.categoryIds.includes(categoryId)) && p.name.toLowerCase().includes(query.trim().toLowerCase())), [catalog, categoryId, query])

  const noteInitial = noteFor === null ? '' : 'order' in noteFor ? order.draft?.note ?? '' : order.draft?.lines.find((l) => l.uuid === noteFor.uuid)?.note ?? ''
  function saveNote(note: string) {
    if (noteFor && 'order' in noteFor) order.orderNote(note)
    else if (noteFor) order.note(noteFor.uuid, note)
    setNoteFor(null)
  }
  async function onSend() { await order.sendToKitchen(); if (!useOrderStore.getState().error) router.push('/salon') }
  async function onBill() { await order.requestBill(); if (!useOrderStore.getState().error) router.push('/salon') }

  if (!catalog || !table || !order.draft) return null
  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col">
        <Topbar
          left={<><Button size="compact" onClick={() => router.push('/salon')}>← {t('back')}</Button><span className="text-[22px] font-bold">{t('header', { number: table.number })}</span><span className="text-[15px] text-soft">{t('meta', { pax: table.seats, ref: order.saved?.reference ?? '—' })}</span></>}
          right={<><input aria-label={t('search')} placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} className="h-tap-min px-4 rounded-[10px] border border-border bg-surface text-[15px] w-56" />
            <Button size="compact" variant={order.draft?.note ? 'primary' : 'secondary'} onClick={() => setNoteFor({ order: true })}>{t('kitchenNote')}{order.draft?.note ? ' ●' : ''}</Button></>}
        />
        {order.error && <p role="alert" className="mx-6 mt-3 px-4 py-3 rounded-md bg-busy-soft text-busy-ink text-[15px]">{order.error}</p>}
        <div className="flex-1 min-h-0 flex">
          <section aria-label={t('menu')} className="flex-1 min-w-0 flex flex-col">
            <CategoryChips categories={catalog.categories} counts={counts} soldOut={catalog.products.filter((p) => p.soldOut).length} activeId={categoryId} onChange={setCategoryId} />
            <ProductGrid products={products} onAdd={order.add} />
          </section>
          <OrderPanel tableNumber={table.number} lines={order.draft.lines} selectedUuid={selectedLine} busy={order.busy}
            onSelectLine={setSelectedLine} onQty={order.changeQty} onNote={(uuid) => setNoteFor({ uuid })} onRemove={(u) => { order.remove(u); setSelectedLine(null) }}
            onSave={order.save} onBill={onBill} onSend={onSend} />
        </div>
      </div>
      {noteFor && <NoteDialog title={'order' in noteFor ? t('kitchenNoteTitle') : t('notePrompt')} initial={noteInitial} onSave={saveNote} onCancel={() => setNoteFor(null)} />}
    </>
  )
}
