'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { ReservationDetailModal } from '@/components/reservations/ReservationDetailModal'
import { ReservationTimeline, TimelineSkeleton } from '@/components/reservations/ReservationTimeline'
import { ReservationWizard } from '@/components/reservations/ReservationWizard'
import { Button } from '@/components/ui/Button'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { useReservationsStore } from '@/lib/stores/reservationsStore'
import { toast } from '@/lib/stores/toastStore'
import { cn } from '@/lib/utils'

// Reservas del kit (7 – Reservation / Home.png): grilla mesa × hora del día, con piso, fecha y "Nueva reserva".
export default function ReservasPage() {
  const t = useTranslations('reservations')
  const session = useAuthStore((s) => s.session)
  const catalog = useCatalogStore((s) => s.catalog)
  const configId = session?.configId ?? catalog?.settings.configId ?? null
  const r = useReservationsStore()
  const [detail, setDetail] = useState<number | null>(null)

  useEffect(() => { if (configId) void r.load(configId) }, [configId, r.date, r.floorId]) // eslint-disable-line react-hooks/exhaustive-deps
  // Cada visita trae la grilla fresca: al salir se olvida lo cargado (lo que se evita es repetir la misma petición
  // dentro de una visita, no volver a pedirla en la siguiente).
  useEffect(() => () => r.forget(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const floors = r.timeline?.floors ?? []
  return (
    <>
      <header className="shrink-0 px-6 py-4 flex items-center gap-4 bg-surface border-b border-border">
        <span className="flex items-center gap-2 h-11 px-4 rounded-md border border-border text-[17px] font-semibold text-ink">
          <Icon name="reservations" size={20} />{t('title')}
        </span>

        {floors.length > 0 && (floors.length <= 3 ? (
          <nav aria-label={t('floors')} className="flex items-center gap-1 p-1 rounded-lg bg-muted">
            {floors.map((floor) => (
              <button key={floor.id} type="button" aria-pressed={r.floorId === floor.id} onClick={() => r.setFloor(floor.id)}
                className={cn('h-9 px-4 rounded-md text-[15px] font-semibold', r.floorId === floor.id ? 'bg-surface border border-border text-ink' : 'text-dim')}>{floor.name}</button>
            ))}
          </nav>
        ) : (
          <label className="flex items-center gap-2 text-[15px] text-soft">{t('floors')}
            <select aria-label={t('floors')} value={r.floorId ?? ''} onChange={(e) => r.setFloor(Number(e.target.value))}
              className="h-11 px-3 rounded-md border border-border bg-surface text-[15px] text-ink">
              {floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}
            </select></label>
        ))}

        <label className="ml-auto flex items-center gap-2 h-11 px-3 rounded-md border border-border text-[15px] text-ink">
          <Icon name="reservations" size={18} className="text-soft" />
          <input type="date" aria-label={t('day')} value={r.date} onChange={(e) => r.setDate(e.target.value)} className="bg-transparent text-ink focus:outline-none" />
        </label>
        <Button variant="primary" size="money" disabled={!configId} onClick={r.openWizard}><Icon name="plus" size={18} />{t('add')}</Button>
      </header>

      {r.error && <p role="alert" className="mx-6 mt-3 px-4 py-3 rounded-md bg-danger-soft text-danger-ink text-[15px]">{r.error}</p>}
      {r.loading && !r.timeline
        ? <TimelineSkeleton />
        : <ReservationTimeline slots={r.timeline?.slots ?? []} tables={r.timeline?.tables ?? []} onOpen={(card) => setDetail(card.id)} />}

      <ReservationDetailModal reservationId={detail} open={detail !== null} onClose={() => setDetail(null)} configId={configId} onChanged={() => { if (configId) void r.load(configId, true) }}
        onAction={(id, state) => { if (configId) { void r.changeState(id, state, configId); setDetail(null) } }} />
      {configId && <ReservationWizard configId={configId} onCreated={(created) => {
        toast({ title: t('created', { name: created.name }), body: created.customerEmail ? t('createdMail') : t('createdBody') })
        // Con anticipo pendiente, el siguiente paso es cobrarlo: se abre el detalle con el enlace de pago listo para compartir.
        if (created.depositState === 'pending') setDetail(created.id)
      }} />}
    </>
  )
}
