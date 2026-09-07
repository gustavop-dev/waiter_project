import { useTranslations } from 'next-intl'

import type { StockLevel } from '@/lib/domain/pantry'
import { cn } from '@/lib/utils'

const TEXT: Record<StockLevel, string> = { high: 'text-success-ink', medium: 'text-progress-ink', low: 'text-danger-ink', empty: 'text-dim' }
const BAR: Record<StockLevel, string> = { high: 'bg-success', medium: 'bg-progress', low: 'bg-danger', empty: 'bg-dim' }
const BARS: Record<StockLevel, number> = { high: 3, medium: 2, low: 1, empty: 0 }

// Nivel de stock del kit: barritas apiladas y palabra en su color (High verde, Medium naranja, low rojo). Sin receta: "—".
export function LevelBadge({ level, size = 13 }: { level: StockLevel | null; size?: 13 | 14 }) {
  const t = useTranslations('pantry.levels')
  if (level === null) return <span className="text-[13px] font-semibold text-dim">{t('none')}</span>
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', TEXT[level], size === 14 ? 'text-[14px]' : 'text-[13px]')} data-level={level}>
      <span className="flex flex-col-reverse gap-px" aria-hidden>
        {[0, 1, 2].map((i) => <span key={i} className={cn('w-1 h-1 rounded-[1px]', i < BARS[level] ? BAR[level] : 'bg-border')} />)}
      </span>
      {t(level)}
    </span>
  )
}
