'use client'

import { useTranslations } from 'next-intl'

import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { useAutomationSubnav } from '@/components/layout/useAutomationSubnav'
import { EmptyState } from '@/components/ui/EmptyState'

export default function AiConfigPage() {
  const t = useTranslations('pos.roi.ai')
  return (
    <Shell mode="sidebar" active="automation" subnav={useAutomationSubnav('config')}>
      <Topbar left={<span className="text-[22px] font-bold">{t('configTitle')}</span>} right={null} />
      <EmptyState title={t('configTitle')} body={t('configBody')} />
    </Shell>
  )
}
