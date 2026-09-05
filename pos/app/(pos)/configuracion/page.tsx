'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useState } from 'react'

import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { BrandForm } from '@/components/settings/BrandForm'
import { SaveBar, ThresholdsForm, useSaveState } from '@/components/settings/SettingsForms'
import { Button } from '@/components/ui/Button'
import { Select, TextInput, Toggle } from '@/components/ui/Field'
import { play, setStation, type SoundId, type Station } from '@/lib/audio/sounds'
import { ROLES, type Role } from '@/lib/domain/roles'
import { getCompany, inviteUser, resendInvite, listFloors, listPaymentMethods, listTaxes, listUsers, saveCompany, saveFloor, saveSettings, saveTable, setUserRole, type CompanyInfo, type FloorInfo, type PaymentMethodInfo, type TaxInfo, type UserInfo } from '@/lib/services/settings'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { cn } from '@/lib/utils'

const SECTIONS = ['restaurant', 'brand', 'floors', 'payments', 'taxes', 'users', 'alerts', 'roi', 'display'] as const
type Section = (typeof SECTIONS)[number]
const DENSITIES = ['compact', 'balanced', 'wide'] as const
const readLocal = (key: string, fallback: string) => { try { return localStorage.getItem(key) ?? fallback } catch { return fallback } }
const writeLocal = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* sin almacenamiento: no pasa nada */ } }

function CompanyForm({ initial }: { initial: CompanyInfo }) {
  const t = useTranslations('pos.settings.restaurant')
  const [c, setC] = useState(initial)
  const [state, save] = useSaveState()
  const field = (key: keyof CompanyInfo, label: string) => <TextInput key={key} label={label} value={String(c[key])} onChange={(e) => setC((v) => ({ ...v, [key]: e.target.value }))} />
  return <div className="flex flex-col gap-4 max-w-md">{field('name', t('name'))}{field('vat', t('vat'))}{field('phone', t('phone'))}{field('email', t('email'))}{field('street', t('street'))}{field('city', t('city'))}<SaveBar state={state} onSave={() => save(() => saveCompany(c))} disabled={!c.name.trim()} /></div>
}

function FloorsForm({ floors, configId, onChanged }: { floors: FloorInfo[]; configId: number; onChanged: () => Promise<void> }) {
  const t = useTranslations('pos.settings.floors')
  const ts = useTranslations('pos.settings')
  const [newFloor, setNewFloor] = useState('')
  const [drafts, setDrafts] = useState<Record<number, { number: number; seats: number; active: boolean }>>({})
  const draft = (id: number, base: { number: number; seats: number; active: boolean }) => drafts[id] ?? base
  return (
    <div className="flex flex-col gap-6">
      {floors.map((f) => (
        <section key={f.id} aria-label={f.name} className="rounded-[18px] bg-surface border border-[#E9E2D7] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between"><span className="text-[17px] font-bold">{f.name}</span><span className="text-sm text-soft">{t('tables', { n: f.tables.length })}</span></div>
          <div className="grid grid-cols-[100px_100px_1fr_auto] gap-3 items-end">
            {f.tables.map((tb) => {
              const d = draft(tb.id, tb)
              return [
                <TextInput key={`n${tb.id}`} label={t('number')} type="number" value={d.number} onChange={(e) => setDrafts((x) => ({ ...x, [tb.id]: { ...d, number: Number(e.target.value) } }))} className="font-mono" />,
                <TextInput key={`s${tb.id}`} label={t('seats')} type="number" value={d.seats} onChange={(e) => setDrafts((x) => ({ ...x, [tb.id]: { ...d, seats: Number(e.target.value) } }))} className="font-mono" />,
                <Toggle key={`a${tb.id}`} label={t('active')} checked={d.active} onChange={(v) => setDrafts((x) => ({ ...x, [tb.id]: { ...d, active: v } }))} onLabel={t('activeOn')} offLabel={t('activeOff')} />,
                <Button key={`b${tb.id}`} size="compact" disabled={!drafts[tb.id]} onClick={async () => { await saveTable(tb.id, f.id, d); await onChanged(); setDrafts((x) => { const { [tb.id]: _omit, ...rest } = x; void _omit; return rest }) }}>{ts('save')}</Button>,
              ]
            })}
          </div>
          <Button size="compact" className="self-start" onClick={async () => { await saveTable(null, f.id, { number: Math.max(0, ...f.tables.map((x) => x.number)) + 1, seats: 4, active: true }); await onChanged() }}>{t('newTable')}</Button>
        </section>
      ))}
      <div className="flex items-end gap-3 max-w-md"><TextInput label={t('floorName')} value={newFloor} onChange={(e) => setNewFloor(e.target.value)} /><Button disabled={!newFloor.trim()} onClick={async () => { await saveFloor(null, newFloor.trim(), configId); setNewFloor(''); await onChanged() }}>{t('newFloor')}</Button></div>
    </div>
  )
}

function UsersForm({ users, onChanged }: { users: UserInfo[]; onChanged: () => Promise<void> }) {
  const t = useTranslations('pos.settings.users')
  const roles = useTranslations('pos.nav.roles')
  const [u, setU] = useState<{ name: string; email: string; role: Role }>({ name: '', email: '', role: 'waiter' })
  const [resent, setResent] = useState<number | null>(null)
  const [state, save] = useSaveState()
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[18px] bg-surface border border-[#E9E2D7] overflow-hidden">
        {users.map((x) => (
          <div key={x.id} className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#F3EFE8] text-[15px]">
            <span className="font-medium">{x.name} <span className="text-soft font-normal">· {x.login}</span></span>
            <span className="flex items-center gap-3">
              <span className={cn('inline-flex h-7 px-2.5 rounded-lg items-center text-[13px] font-medium', x.activated ? 'bg-free-soft text-free-ink' : 'bg-pending-soft text-pending-ink')}>{x.activated ? t('active') : t('pending')}</span>
              {!x.activated && <Button size="compact" onClick={async () => { await resendInvite(x.id); setResent(x.id) }}>{resent === x.id ? t('resent') : t('resend')}</Button>}
              <span className="text-soft">{t('lastLogin')}: {x.lastLogin ? x.lastLogin.slice(0, 10) : t('never')}</span>
              <select aria-label={`${t('role')}: ${x.name}`} value={x.role} onChange={async (e) => { await setUserRole(x.id, e.target.value as Role); await onChanged() }} className="h-tap-min px-3 rounded-[10px] border border-border bg-surface text-[15px]">
                {ROLES.map((r) => <option key={r} value={r}>{roles(r)}</option>)}
              </select></span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 max-w-md">
        <TextInput label={t('name')} value={u.name} onChange={(e) => setU((v) => ({ ...v, name: e.target.value }))} />
        <TextInput label={t('email')} type="email" value={u.email} onChange={(e) => setU((v) => ({ ...v, email: e.target.value }))} hint={t('emailHint')} />
        <Select label={t('role')} hint={t('roleHint')} value={u.role} onChange={(e) => setU((v) => ({ ...v, role: e.target.value as Role }))}>{ROLES.map((r) => <option key={r} value={r}>{roles(r)}</option>)}</Select>
        <SaveBar state={state} onSave={() => save(async () => { await inviteUser(u); setU({ name: '', email: '', role: 'waiter' }); await onChanged() })} disabled={!u.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u.email)} />
      </div>
    </div>
  )
}

function DisplayForm() {
  const t = useTranslations('pos.settings.display')
  const [density, setDensity] = useState(() => readLocal('waiter.density', 'wide'))
  const [station, setSt] = useState<Station>(() => readLocal('waiter.station', 'tablet') as Station)
  useEffect(() => { document.documentElement.dataset.density = density; writeLocal('waiter.density', density) }, [density])
  useEffect(() => { setStation(station); writeLocal('waiter.station', station) }, [station])
  return (
    <div className="flex flex-col gap-5 max-w-md">
      <Select label={t('density')} value={density} onChange={(e) => setDensity(e.target.value)}>{DENSITIES.map((d) => <option key={d} value={d}>{t(d === 'compact' ? 'compact' : d === 'balanced' ? 'balanced' : 'wide')}</option>)}</Select>
      <Select label={t('station')} value={station} onChange={(e) => setSt(e.target.value as Station)}><option value="kds">{t('kds')}</option><option value="tablet">{t('tablet')}</option><option value="caja">{t('caja')}</option></Select>
      <div className="flex flex-wrap gap-2">{(['tap', 'ticket', 'listo', 'demora', 'critico', 'llama', 'cobro', 'error'] as SoundId[]).map((id) => <Button key={id} size="compact" onClick={() => play(id)}>{t('test')}: {id}</Button>)}</div>
      <p className="text-[13px] text-soft">{t('localHint')}</p>
    </div>
  )
}

function ConfiguracionInner() {
  const t = useTranslations('pos.settings')
  const params = useSearchParams()
  const session = useAuthStore((s) => s.session)
  const { catalog, load } = useCatalogStore()
  const initialSection = params.get('seccion') === 'alertas' ? 'alerts' : 'restaurant'
  const [section, setSection] = useState<Section>(initialSection)
  const [company, setCompany] = useState<CompanyInfo | null>(null)
  const [floors, setFloors] = useState<FloorInfo[]>([])
  const [methods, setMethods] = useState<PaymentMethodInfo[]>([])
  const [taxes, setTaxes] = useState<TaxInfo[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const reloadFloors = () => listFloors().then(setFloors)
  const reloadUsers = () => listUsers().then(setUsers)
  useEffect(() => { void getCompany().then(setCompany); void reloadFloors(); void listPaymentMethods().then(setMethods); void listTaxes().then(setTaxes); void reloadUsers() }, [])
  if (!catalog) return null
  const onSaveSettings = async (s: typeof catalog.settings) => { await saveSettings(s); if (session) await load(session.id) }
  return (
    <Shell mode="sidebar" active="settings">
      <Topbar left={<span className="text-[22px] font-bold">{t('title')}</span>} right={null} />
      <div className="flex-1 min-h-0 flex">
        <nav aria-label={t('title')} className="w-[248px] shrink-0 border-r border-border bg-surface p-3 flex flex-col gap-1">
          {SECTIONS.map((s) => <button key={s} type="button" aria-current={section === s ? 'page' : undefined} onClick={() => setSection(s)} className={cn('h-tap-min px-3.5 rounded-[10px] text-left text-[15px]', section === s ? 'bg-ink text-canvas font-bold' : 'hover:bg-muted')}>{t(`sections.${s}`)}</button>)}
        </nav>
        <section aria-label={t(`sections.${section}`)} className="flex-1 min-w-0 p-6 px-7 overflow-y-auto">
          <h2 className="text-[19px] font-bold mb-4">{t(`sections.${section}`)}</h2>
          {section === 'restaurant' && company && <CompanyForm key={company.id} initial={company} />}
          {section === 'brand' && <BrandForm restaurantName={company?.name ?? ''} />}
          {section === 'floors' && <FloorsForm floors={floors} configId={catalog.settings.configId} onChanged={reloadFloors} />}
          {section === 'payments' && <div className="flex flex-col gap-2 max-w-md"><p className="text-[15px] text-soft">{t('payments.hint')}</p>{methods.map((m) => <div key={m.id} className="flex justify-between px-4 py-3 rounded-[10px] bg-surface border border-border text-[15px]"><span className="font-medium">{m.name}</span><span className="text-soft">{t(`payments.type.${m.type as 'cash' | 'bank' | 'pay_later'}`)}</span></div>)}</div>}
          {section === 'taxes' && <div className="flex flex-col gap-2 max-w-md"><p className="text-[15px] text-soft">{t('taxes.hint')}</p>{taxes.map((x) => <div key={x.id} className="flex justify-between px-4 py-3 rounded-[10px] bg-surface border border-border text-[15px]"><span className="font-medium">{x.name}</span><span className="font-mono tabular text-soft">{x.amount}%</span></div>)}</div>}
          {section === 'users' && <UsersForm users={users} onChanged={reloadUsers} />}
          {section === 'alerts' && <ThresholdsForm key="alerts" initial={catalog.settings} section="alerts" onSave={onSaveSettings} />}
          {section === 'roi' && <ThresholdsForm key="roi" initial={catalog.settings} section="roi" onSave={onSaveSettings} />}
          {section === 'display' && <DisplayForm />}
        </section>
      </div>
    </Shell>
  )
}

export default function ConfiguracionPage() {
  return <Suspense fallback={null}><ConfiguracionInner /></Suspense>
}
