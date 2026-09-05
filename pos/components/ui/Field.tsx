'use client'

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { useId } from 'react'

import { cn } from '@/lib/utils'

const CONTROL = 'h-tap-min px-3.5 rounded-[10px] border border-border bg-surface text-base text-ink focus:outline-2 focus:outline-brand-500 disabled:opacity-50'

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[15px] font-medium">{label}</span>
      {children(id)}
      {hint && <span className="text-[13px] text-soft">{hint}</span>}
    </label>
  )
}

export function TextInput({ label, hint, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
  return <Field label={label} hint={hint}>{(id) => <input id={id} className={cn(CONTROL, className)} {...rest} />}</Field>
}

export function Select({ label, hint, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: ReactNode }) {
  return <Field label={label} hint={hint}>{(id) => <select id={id} className={cn(CONTROL, className)} {...rest}>{children}</select>}</Field>
}

// Interruptor táctil de 48 px: el estado se lee en texto, no solo en color.
export function Toggle({ label, checked, onChange, onLabel, offLabel }: { label: string; checked: boolean; onChange: (v: boolean) => void; onLabel: string; offLabel: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className="h-tap-min px-1 pr-3.5 rounded-full border border-border bg-surface flex items-center gap-2.5 text-[15px]">
      <span className={cn('w-10 h-10 rounded-full grid place-items-center transition-colors', checked ? 'bg-free text-white' : 'bg-muted text-soft')} aria-hidden>{checked ? '✓' : '–'}</span>
      <span className="flex flex-col leading-tight text-left"><span className="font-medium">{label}</span><span className="text-[13px] text-soft">{checked ? onLabel : offLabel}</span></span>
    </button>
  )
}
