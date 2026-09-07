'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { Modal } from '@/components/kit/Modal'

// "Lista de reservas" del kit (Reservation Information.png). Sin módulo de reservas todavía: cabecera real y
// estado vacío honesto; nada de filas inventadas.
export function ReservationListModal({ open, onClose, tableName }: { open: boolean; onClose: () => void; tableName: string }) {
  const t = useTranslations('tables.reservations')
  return (
    <Modal open={open} onClose={onClose} title={t('title')}>
      <div className="flex flex-col">
        <div className="px-4 -mt-1 flex items-center gap-2 text-[14px] text-dim"><Icon name="reservations" size={18} /><span className="sr-only">{t('title')}</span></div>
        <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] px-4 h-11 items-center border-b border-border text-[15px] font-semibold text-ink">
          <span>{t('customer')}</span><span>{t('date')}</span><span>{t('time')}</span><span className="w-16" />
        </div>
        <KitEmptyState icon="reservations" title={t('emptyTitle')} body={t('emptyBody', { name: tableName })} />
      </div>
    </Modal>
  )
}
