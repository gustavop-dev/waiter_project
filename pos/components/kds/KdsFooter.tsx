'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'

const LEGEND = [['ok', 'bg-free'], ['warn', 'bg-pending'], ['late', 'bg-busy']] as const

export function KdsFooter({ muted, onToggleMute }: { muted: boolean; onToggleMute: () => void }) {
  const t = useTranslations('pos.kds')
  return (
    <footer className="h-16 px-6 flex items-center gap-6 border-t border-kds-raised bg-kds-bg text-[15px] text-sidebar-soft">
      {LEGEND.map(([key, dot]) => <span key={key} className="flex items-center gap-2"><span aria-hidden className={`w-2.5 h-2.5 rounded-full ${dot}`} />{t(`legend.${key}`)}</span>)}
      <span>{t('legend.suffix')}</span>
      <span className="ml-auto flex gap-3">
        <Button size="compact" className="bg-kds-surface text-sidebar-soft border-transparent" disabled>{t('history')}</Button>
        <Button size="compact" className="bg-kds-surface text-kds-ink border-transparent" aria-pressed={muted} onClick={onToggleMute}>{muted ? t('unmute') : t('mute')}</Button>
      </span>
    </footer>
  )
}
