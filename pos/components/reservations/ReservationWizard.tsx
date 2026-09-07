'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { WizardSteps } from '@/components/kit/WizardSteps'
import { MenuStep } from '@/components/orders/MenuStep'
import { InfoStep } from '@/components/reservations/InfoStep'
import { SummaryStep } from '@/components/reservations/SummaryStep'
import { TableStep } from '@/components/reservations/TableStep'
import { DateTimeModal } from '@/components/reservations/DateTimeModal'
import { cartTotals } from '@/lib/domain/orderWizard'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useReservationsStore } from '@/lib/stores/reservationsStore'
import type { ReservationDetail } from '@/lib/services/reservations'

const NO_GROUPS = [] as never[]

// Asistente "Add New Reservation" del kit (7 – Reservation / Add New): cuatro pasos a pantalla completa.
export function ReservationWizard({ configId, onCreated }: { configId: number; onCreated: (created: ReservationDetail) => void }) {
  const t = useTranslations('reservations.wizard')
  const catalog = useCatalogStore((s) => s.catalog)
  const r = useReservationsStore()
  const [picking, setPicking] = useState(false)
  const totals = useMemo(() => cartTotals(r.lines, r.taxes), [r.lines, r.taxes])
  const steps = [t('steps.info'), t('steps.table'), t('steps.dishes'), t('steps.summary')]
  const tableNumber = r.tables.find((x) => x.id === r.draft.tableId)?.tableNumber ?? null

  useEffect(() => { if (r.open) void r.loadSlots(configId, r.draft.date ?? r.date) }, [r.open, r.draft.date]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (catalog) void r.loadExtras(catalog) }, [catalog]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (r.stepIndex === 1) void r.loadTables(configId) }, [r.stepIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!r.open || !catalog) return null

  async function create() {
    const created = await r.create(configId)
    if (created) onCreated(created)
  }

  return (
    <div className="fixed inset-0 z-50 bg-canvas flex flex-col">
      <header className="h-[76px] shrink-0 px-6 flex items-center gap-4 bg-surface border-b border-border">
        {r.stepIndex > 0 && (
          <button type="button" aria-label={t('back')} onClick={r.back} className="w-10 h-10 rounded-full bg-ink text-surface grid place-items-center"><Icon name="chevronLeft" size={20} /></button>
        )}
        <span className="text-[20px] font-semibold text-ink">{t('title')}</span>
        <div className="mx-auto"><WizardSteps steps={steps} current={r.stepIndex} /></div>
        <button type="button" aria-label={t('close')} onClick={r.closeWizard} className="w-10 h-10 rounded-full bg-ink text-surface grid place-items-center"><Icon name="close" size={20} /></button>
      </header>

      {r.stepIndex === 0 && (
        <InfoStep draft={r.draft} onChange={r.setDraft} onPickMoment={() => setPicking(true)} onContinue={r.next} />
      )}
      {r.stepIndex === 1 && r.draft.date && r.draft.timeStart !== null && (
        <TableStep tables={r.tables} date={r.draft.date} time={r.draft.timeStart} selected={r.draft.tableId}
          onSelect={(tableId) => r.setDraft({ tableId })} onContinue={r.next} />
      )}
      {r.stepIndex === 2 && (
        <div className="flex-1 min-h-0 flex flex-col">
          <MenuStep products={catalog.products} categories={catalog.categories} taxes={r.taxes}
            optionsOf={(id) => r.extras?.options.get(id) ?? NO_GROUPS} descriptionOf={(id) => r.extras?.descriptions.get(id) ?? ''}
            lines={r.lines} onAdd={r.add} onUpdate={r.update} onQty={r.setQty} onReset={r.clear} onContinue={r.next} />
        </div>
      )}
      {r.stepIndex === 3 && (
        <SummaryStep draft={r.draft} tableNumber={tableNumber} lines={r.lines} totals={totals} busy={r.busy} onCreate={create} />
      )}

      <DateTimeModal open={picking} onClose={() => setPicking(false)} date={r.draft.date} time={r.draft.timeStart} slots={r.slots}
        onPick={(date, time) => { r.setDraft({ date, timeStart: time, tableId: null }); setPicking(false); void r.loadSlots(configId, date) }} />
      {r.error && <p role="alert" className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-md bg-danger-soft text-danger-ink text-[15px]">{r.error}</p>}
    </div>
  )
}
