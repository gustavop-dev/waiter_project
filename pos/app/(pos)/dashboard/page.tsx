'use client'

import { useTranslations } from 'next-intl'

import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { KitShell } from '@/components/kit/KitShell'

// Estado vacío honesto hasta que su oleada del Plan I pinte esta pantalla del kit.
export default function DashboardPage() {
  const t = useTranslations('pos.kit.soon')
  return <KitShell><KitEmptyState icon="dashboard" title={t('dashboard')} body={t('body')} /></KitShell>
}
