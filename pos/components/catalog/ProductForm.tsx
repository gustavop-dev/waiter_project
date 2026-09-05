'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Select, TextInput, Toggle } from '@/components/ui/Field'
import type { AdminCategory, ProductInput, Tax } from '@/lib/services/catalogAdmin'

interface ProductFormProps { initial: ProductInput; isNew: boolean; categories: AdminCategory[]; taxes: Tax[]; onSave: (p: ProductInput) => Promise<void>; onClose: () => void }

export function ProductForm({ initial, isNew, categories, taxes, onSave, onClose }: ProductFormProps) {
  const t = useTranslations('pos.catalog.form')
  const ui = useTranslations('pos.ui')
  const [p, setP] = useState(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const patch = (x: Partial<ProductInput>) => setP((c) => ({ ...c, ...x }))
  const toggleCategory = (id: number) => patch({ categoryIds: p.categoryIds.includes(id) ? p.categoryIds.filter((c) => c !== id) : [...p.categoryIds, id] })
  async function save() {
    setState('saving')
    try { await onSave(p); setState('saved') } catch { setState('error') }
  }
  return (
    <Drawer title={isNew ? t('newTitle') : t('title')} subtitle={isNew ? undefined : initial.name} onClose={onClose} closeLabel={ui('close')}
      footer={<><Button variant="primary" className="flex-1" onClick={save} disabled={state === 'saving' || !p.name.trim()}>{t('save')}</Button><Button onClick={onClose}>{ui('cancel')}</Button></>}>
      <TextInput label={t('name')} value={p.name} onChange={(e) => patch({ name: e.target.value })} />
      <TextInput label={t('price')} type="number" inputMode="numeric" min={0} value={p.price} onChange={(e) => patch({ price: Number(e.target.value) })} className="font-mono" />
      <Select label={t('tax')} value={p.taxIds[0] ?? ''} onChange={(e) => patch({ taxIds: e.target.value ? [Number(e.target.value)] : [] })}>
        <option value="">—</option>{taxes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </Select>
      <fieldset className="flex flex-col gap-1.5"><legend className="text-[15px] font-medium mb-1.5">{t('categories')}</legend>
        <div className="flex flex-wrap gap-2">{categories.map((c) => (
          <button key={c.id} type="button" aria-pressed={p.categoryIds.includes(c.id)} onClick={() => toggleCategory(c.id)}
            className={`h-tap-min px-4 rounded-full border text-[15px] ${p.categoryIds.includes(c.id) ? 'bg-brand-500 text-white border-brand-500 font-bold' : 'bg-surface border-border'}`}>{c.name}</button>
        ))}</div>
      </fieldset>
      <TextInput label={t('description')} value={p.description} onChange={(e) => patch({ description: e.target.value })} />
      <Toggle label={t('available')} checked={p.available} onChange={(v) => patch({ available: v })} onLabel={t('availableOn')} offLabel={t('availableOff')} />
      <Toggle label={t('favorite')} checked={p.favorite} onChange={(v) => patch({ favorite: v })} onLabel={t('favoriteOn')} offLabel={t('favoriteOff')} />
      <Toggle label={t('storable')} checked={p.storable} onChange={(v) => patch({ storable: v })} onLabel={t('storableOn')} offLabel={t('storableOff')} />
      {state === 'saved' && <p role="status" className="text-[15px] text-free-ink">{t('saved')}</p>}
      {state === 'error' && <p role="alert" className="text-[15px] text-busy-ink">{ui('error')}</p>}
    </Drawer>
  )
}
