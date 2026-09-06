'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Icon, type KitIcon } from '@/components/kit/Icon'
import { Modal } from '@/components/kit/Modal'
import { Toggle } from '@/components/kit/Toggle'
import { Button } from '@/components/ui/Button'
import { THEME_MODES, type ThemeMode } from '@/lib/design/tokens'
import type { Role } from '@/lib/domain/roles'
import { useTheme } from '@/lib/hooks/useTheme'
import { cn } from '@/lib/utils'

const TABS: [Tab, KitIcon][] = [['profile', 'user'], ['notifications', 'bell'], ['security', 'lock'], ['display', 'photo']]
type Tab = 'profile' | 'notifications' | 'security' | 'display'
const CHANNELS = ['kitchen', 'inventory', 'system'] as const
const MODES = ['popup', 'sound'] as const
const NOTIFY_KEY = 'waiter.notify'
const readNotify = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(NOTIFY_KEY) || '{}') } catch { return {} } }

// Modal "Setting" del kit (10 – Account Setting/*.png): pestañas verticales, panel, tarjeta de sesión y salir.
// Las preferencias de aviso viven en el dispositivo hasta que la oleada I.5 las lleve a Odoo.
export function SettingsModal({ open, onClose, user, restaurant, onLogout }: { open: boolean; onClose: () => void; user: { name: string; role: Role }; restaurant: string; onLogout: () => Promise<void> }) {
  const t = useTranslations('pos.kit.settings')
  const tr = useTranslations('pos.nav.roles')
  const [tab, setTab] = useState<Tab>('profile')
  const [confirming, setConfirming] = useState(false)
  const { mode, setMode } = useTheme()
  const [notify, setNotify] = useState<Record<string, boolean>>(readNotify)
  const flip = (key: string, v: boolean) => { const next = { ...notify, [key]: v }; setNotify(next); try { localStorage.setItem(NOTIFY_KEY, JSON.stringify(next)) } catch { /* sin almacenamiento */ } }
  const on = (key: string) => notify[key] ?? true

  return (
    <>
      <Modal open={open} onClose={onClose} title={t('title')} size="wide">
        <div className="h-full flex">
          <aside className="w-[280px] shrink-0 border-r border-border p-4 flex flex-col gap-1">
            <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-1">
              {TABS.map(([key, icon]) => (
                <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                  className={cn('flex items-center gap-3 h-12 px-3 rounded-md text-[15px] font-semibold', tab === key ? 'bg-surface border border-border text-ink' : 'text-soft hover:bg-muted')}>
                  <Icon name={icon} size={20} /><span>{t(`tabs.${key}`)}</span>
                </button>
              ))}
            </div>
            <div className="mt-auto p-4 rounded-md bg-muted flex flex-col gap-3">
              <span className="text-[13px] text-soft">{t('session')}</span>
              <Button variant="destructive" onClick={() => setConfirming(true)}><Icon name="logout" size={18} />{t('logout')}</Button>
            </div>
          </aside>
          <section className="flex-1 min-w-0 p-6 overflow-auto">
            {tab === 'profile' && (
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-[15px]">
                <div><dt className="text-dim">{t('profile.name')}</dt><dd className="font-semibold text-ink">{user.name}</dd></div>
                <div><dt className="text-dim">{t('profile.role')}</dt><dd className="font-semibold text-ink">{tr(user.role)}</dd></div>
                <div><dt className="text-dim">{t('profile.restaurant')}</dt><dd className="font-semibold text-ink">{restaurant || '—'}</dd></div>
                <p className="col-span-2 text-[13px] text-dim">{t('profile.soon')}</p>
              </dl>
            )}
            {tab === 'notifications' && CHANNELS.map((ch) => (
              <div key={ch} className="py-4 border-b border-border flex flex-col gap-3">
                <div><p className="font-semibold text-ink">{t(`notify.${ch}.title`)}</p><p className="text-[13px] text-soft">{t(`notify.${ch}.body`)}</p></div>
                {MODES.map((m) => (
                  <div key={m} className="flex items-center justify-between text-[15px] text-ink">
                    <span>{t(`notify.${m}`)}</span>
                    <Toggle checked={on(`${ch}.${m}`)} onChange={(v) => flip(`${ch}.${m}`, v)} label={`${t(`notify.${ch}.title`)} ${t(`notify.${m}`)}`} />
                  </div>
                ))}
              </div>
            ))}
            {tab === 'security' && (
              <div className="flex items-center justify-between py-4 border-b border-border">
                <div><p className="font-semibold text-ink">PIN</p><p className="text-[13px] text-soft">{t('security.pinSoon')}</p></div>
                <Button disabled>{t('security.changePin')}<Icon name="chevronRight" size={16} /></Button>
              </div>
            )}
            {tab === 'display' && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div><p className="font-semibold text-ink">{t('display.language')}</p><p className="text-[13px] text-soft">{t('display.languageBody')}</p></div>
                  <Button disabled><Icon name="language" size={18} />Español</Button>
                </div>
                <div>
                  <p className="font-semibold text-ink">{t('display.colorMode')}</p><p className="text-[13px] text-soft mb-3">{t('display.colorModeBody')}</p>
                  <div role="radiogroup" aria-label={t('display.colorMode')} className="grid grid-cols-3 gap-3">
                    {THEME_MODES.map((m: ThemeMode) => (
                      <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                        className={cn('h-28 rounded-lg border-2 flex flex-col items-center justify-center gap-2 text-[15px] font-semibold', mode === m ? 'border-primary text-primary' : 'border-border text-soft')}>
                        <span className={cn('w-16 h-10 rounded-sm border border-border', m === 'dark' ? 'bg-[#131316]' : m === 'light' ? 'bg-white' : 'bg-gradient-to-r from-white to-[#131316]')} />
                        {t(`display.${m}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </Modal>
      <Modal open={confirming} onClose={() => setConfirming(false)} footer={
        <div className="flex gap-3"><Button className="flex-1" onClick={() => setConfirming(false)}>{t('logoutNo')}</Button><Button variant="primary" className="flex-1" onClick={() => { setConfirming(false); void onLogout() }}>{t('logoutYes')}</Button></div>
      }>
        <div className="p-8 text-center flex flex-col items-center gap-3">
          <span className="w-14 h-14 rounded-full bg-primary-soft text-primary grid place-items-center"><Icon name="logout" size={26} /></span>
          <p className="text-[20px] font-semibold text-ink">{t('logoutTitle')}</p><p className="text-soft">{t('logoutBody')}</p>
        </div>
      </Modal>
    </>
  )
}
