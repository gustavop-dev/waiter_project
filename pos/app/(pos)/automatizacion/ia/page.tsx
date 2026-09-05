'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { useAutomationSubnav } from '@/components/layout/useAutomationSubnav'
import { EmptyState } from '@/components/ui/EmptyState'

export default function AiAnalyticsPage() {
  const t = useTranslations('pos.roi.ai')
  const nav = useTranslations('pos.nav')
  return (
    <Shell mode="sidebar" active="automation" subnav={useAutomationSubnav('ai')}>
      <Topbar left={<span className="text-[22px] font-bold">{t('title')}</span>} right={null} />
      <EmptyState title={t('title')} body={t('body')} action={<Link href="/automatizacion" className="text-brand-600 font-medium">← {nav('roi')}</Link>} />
    </Shell>
  )
}
