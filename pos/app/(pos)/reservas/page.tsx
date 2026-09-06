'use client'

import { useTranslations } from 'next-intl'

import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { KitShell } from '@/components/kit/KitShell'

// Estado vacío honesto hasta que su oleada del Plan I pinte esta pantalla del kit.
export default function ReservasPage() {
  const t = useTranslations('pos.kit.soon')
  return <KitShell><KitEmptyState icon="reservations" title={t('reservations')} body={t('body')} /></KitShell>
}
