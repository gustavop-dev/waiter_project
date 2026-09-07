'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { EmployeeAvatar } from '@/components/account/EmployeeAvatar'
import { Icon } from '@/components/kit/Icon'
import { NumericKeypad } from '@/components/kit/NumericKeypad'
import { PinInput } from '@/components/kit/PinInput'
import { Button } from '@/components/ui/Button'
import { shiftLabel } from '@/lib/domain/employees'
import type { PosEmployee } from '@/lib/services/employees'
import { cn } from '@/lib/utils'

const PIN_LENGTH = 6

// "Employee Login" del kit (Select Employee.png y Select Employee-1.png): selector desplegable con foto,
// nombre y turno de hoy, seis casillas de PIN, teclado numérico e "Iniciar turno".
export function EmployeeLogin({ employees, loading, onStart, onForgot }: { employees: PosEmployee[]; loading: boolean; onStart: (employee: PosEmployee, pin: string) => Promise<boolean>; onForgot: () => void }) {
  const t = useTranslations('account.employee')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const selected = employees.find((e) => e.id === selectedId) ?? employees[0] ?? null
  const label = (e: PosEmployee) => shiftLabel(e.shift, t('noShift'))
  const digit = (d: string) => { setWrong(false); setPin((p) => (p + d).slice(0, PIN_LENGTH)) }
  const backspace = () => setPin((p) => p.slice(0, -1))

  async function start() {
    if (!selected || busy) return
    setBusy(true)
    try {
      const ok = await onStart(selected, pin)
      if (!ok) { setWrong(true); setPin('') }
    } finally { setBusy(false) }
  }

  // Teclado físico: dígitos, borrar e Intro hacen lo mismo que el teclado en pantalla.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) digit(e.key)
      else if (e.key === 'Backspace') backspace()
      else if (e.key === 'Enter' && pin.length === PIN_LENGTH) void start()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex flex-col items-center w-[440px]">
      <h1 className="text-[24px] font-semibold text-ink">{t('title')}</h1>
      <p className="mt-1 text-[16px] text-dim">{t('subtitle')}</p>

      <div className="relative mt-5 w-full">
        <button type="button" aria-label={t('select')} aria-haspopup="listbox" aria-expanded={open} disabled={!selected} onClick={() => setOpen((v) => !v)}
          className="w-full h-[60px] px-3 rounded-md border border-border bg-surface flex items-center gap-3 text-left disabled:opacity-60">
          {selected ? (
            <>
              <EmployeeAvatar id={selected.id} name={selected.name} />
              <span className="flex-1 min-w-0 flex flex-col leading-tight"><span className="text-[17px] font-semibold text-ink truncate">{selected.name}</span><span className="text-[14px] text-dim">{label(selected)}</span></span>
            </>
          ) : (
            <span className="flex-1 text-[15px] text-dim">{loading ? t('loading') : t('noEmployees')}</span>
          )}
          <Icon name="chevronDown" size={20} className={cn('text-ink transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <ul role="listbox" aria-label={t('list')} className="absolute left-0 right-0 top-full mt-2 max-h-[236px] overflow-auto p-2 rounded-md border border-border bg-surface shadow-xl z-20">
            {employees.map((e) => {
              const active = e.id === selected?.id
              return (
                <li key={e.id} role="option" aria-selected={active} onClick={() => { setSelectedId(e.id); setOpen(false); setPin(''); setWrong(false) }}
                  className={cn('flex items-center gap-3 h-[70px] px-3 rounded-md cursor-pointer', active ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-muted')}>
                  <EmployeeAvatar id={e.id} name={e.name} />
                  <span className="flex-1 min-w-0 flex flex-col leading-tight"><span className="text-[17px] font-semibold truncate">{e.name}</span><span className={cn('text-[14px]', active ? 'text-primary/80' : 'text-dim')}>{label(e)}</span></span>
                  {active && <Icon name="check" size={20} />}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="mt-9 text-[15px] text-dim">{t('pinHint')}</p>
      <div className="mt-3"><PinInput value={pin} label={t('pin')} /></div>
      {wrong && <p role="alert" className="mt-2 text-[14px] text-danger-ink">{t('wrongPin')}</p>}
      <button type="button" onClick={onForgot} className="mt-3 text-[15px] font-semibold text-primary">{t('forgot')}</button>

      <div className="mt-8"><NumericKeypad onDigit={digit} onBackspace={backspace} disabled={!selected || busy} /></div>
      <Button variant="primary" className="mt-8 w-full h-12 text-[17px] font-semibold" disabled={!selected || busy} onClick={() => void start()}>{t('start')}</Button>
    </div>
  )
}
