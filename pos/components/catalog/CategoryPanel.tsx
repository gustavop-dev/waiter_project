'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { TextInput } from '@/components/ui/Field'
import type { AdminCategory } from '@/lib/services/catalogAdmin'

interface CategoryPanelProps { categories: AdminCategory[]; onSave: (id: number | null, c: { name: string; station: string | null }) => Promise<void>; onClose: () => void }

export function CategoryPanel({ categories, onSave, onClose }: CategoryPanelProps) {
  const t = useTranslations('pos.catalog.catForm')
  const ui = useTranslations('pos.ui')
  const [drafts, setDrafts] = useState<Record<string, { name: string; station: string }>>(() =>
    Object.fromEntries([...categories.map((c) => [String(c.id), { name: c.name, station: c.station ?? '' }]), ['new', { name: '', station: '' }]]))
  const edit = (key: string, patch: Partial<{ name: string; station: string }>) => setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } }))
  const rows = [...categories.map((c) => String(c.id)), 'new']
  return (
    <Drawer title={t('title')} onClose={onClose} closeLabel={ui('close')}>
      {rows.map((key) => {
        const d = drafts[key]
        const isNew = key === 'new'
        return (
          <section key={key} aria-label={isNew ? t('new') : d.name} className="flex flex-col gap-2.5 pb-4 border-b border-[#EFE9E0]">
            {isNew && <span className="text-[13px] tracking-[0.1em] uppercase text-ink-3 font-medium">{t('new')}</span>}
            <TextInput label={t('name')} value={d.name} onChange={(e) => edit(key, { name: e.target.value })} />
            <TextInput label={t('station')} hint={t('stationHint')} value={d.station} onChange={(e) => edit(key, { station: e.target.value })} />
            <Button size="compact" className="self-end" disabled={!d.name.trim()} onClick={() => onSave(isNew ? null : Number(key), { name: d.name.trim(), station: d.station.trim() || null })}>{t('save')}</Button>
          </section>
        )
      })}
    </Drawer>
  )
}
