'use client'

import { useTranslations } from 'next-intl'

import { Modal } from '@/components/kit/Modal'
import { cn } from '@/lib/utils'

// Rejilla de idiomas del kit (Account Setting/Change Language.png). Solo Español está activo: los demás llegan con su traducción.
export const LANGUAGES: { code: string; name: string; region: string }[] = [
  { code: 'en', name: 'English', region: 'United States' }, { code: 'id', name: 'Bahasa Indonesia', region: 'Indonesia' }, { code: 'es', name: 'Español', region: 'Colombia' },
  { code: 'fr', name: 'Français', region: 'France' }, { code: 'de', name: 'Deutsch', region: 'Deutschland' }, { code: 'it', name: 'Italiano', region: 'Italia' },
  { code: 'pt', name: 'Português', region: 'Portugal' }, { code: 'ru', name: 'Русский', region: 'Россия' }, { code: 'zh', name: '中文', region: '中国' },
  { code: 'ar', name: 'العربية', region: 'المملكة العربية السعودية' }, { code: 'ja', name: '日本語', region: '日本' },
]
export const ACTIVE_LANGUAGE = 'es'

export function LanguageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('account.settings.display')
  return (
    <Modal open={open} onClose={onClose} title={t('chooseLanguage')}>
      <div role="radiogroup" aria-label={t('chooseLanguage')} className="p-5 grid grid-cols-3 gap-x-4 gap-y-2">
        {LANGUAGES.map((l) => {
          const active = l.code === ACTIVE_LANGUAGE
          return (
            <button key={l.code} type="button" role="radio" aria-checked={active} disabled={!active} lang={l.code} onClick={active ? onClose : undefined}
              className={cn('h-[60px] px-3 rounded-md border text-left flex flex-col justify-center', active ? 'border-ink text-ink' : 'border-transparent text-soft disabled:opacity-70')}>
              <span className="text-[15px] font-semibold text-ink">{l.name}</span>
              <span className="text-[13px] text-soft">{l.region}{!active && <span className="text-dim"> · {t('soon')}</span>}</span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
