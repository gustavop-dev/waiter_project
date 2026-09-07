'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Chip } from '@/components/kit/Chip'
import { Icon } from '@/components/kit/Icon'
import { Modal } from '@/components/kit/Modal'
import { Toggle } from '@/components/kit/Toggle'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextInput } from '@/components/ui/Field'
import { SPICY_LEVELS, listToText, textToList, type DinerAttributes, type SpicyLevel } from '@/lib/domain/dinerAttributes'
import type { AdminCategory, ProductInput, Tax } from '@/lib/services/catalogAdmin'
import { cn } from '@/lib/utils'

type Step = 'info' | 'image' | 'attributes'
const STEPS: Step[] = ['info', 'image', 'attributes']
const CONTROL = 'h-tap-min px-3.5 rounded-[10px] border border-border bg-surface text-base text-ink focus:outline-2 focus:outline-brand-500'

interface ProductFormProps { initial: ProductInput; hasImage?: boolean; templateId?: number | null; isNew: boolean; categories: AdminCategory[]; taxes: Tax[]; onSave: (p: ProductInput) => Promise<void>; onClose: () => void }

// Formulario de producto con la estructura del wizard "Add New Dish" del kit: pasos a la izquierda, panel con cabecera a la
// derecha y el botón al pie. Los atributos del comensal (diner_attributes) se editan en el tercer paso.
export function ProductForm({ initial, hasImage = false, templateId = null, isNew, categories, taxes, onSave, onClose }: ProductFormProps) {
  const t = useTranslations('admin.catalog.form')
  const ui = useTranslations('admin.common')
  const [step, setStep] = useState<Step>('info')
  const [p, setP] = useState<ProductInput>({ ...initial, dinerAttributes: initial.dinerAttributes ?? {} })
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const patch = (x: Partial<ProductInput>) => setP((c) => ({ ...c, ...x }))
  const attrs = p.dinerAttributes
  const patchAttr = (x: Partial<DinerAttributes>) => patch({ dinerAttributes: { ...attrs, ...x } })
  const toggleCategory = (id: number) => patch({ categoryIds: p.categoryIds.includes(id) ? p.categoryIds.filter((c) => c !== id) : [...p.categoryIds, id] })
  const numOrUndefined = (v: string) => (v === '' ? undefined : Number(v))
  async function save() {
    setState('saving')
    try { await onSave(p); setState('saved') } catch { setState('error') }
  }
  const toggleRow = (label: string, hint: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border"><div><p className="text-[15px] font-medium text-ink">{label}</p><p className="text-[13px] text-soft">{hint}</p></div><Toggle checked={checked} onChange={onChange} label={label} /></div>
  )
  const sizes = attrs.tamanos ?? []
  const setSize = (i: number, s: Partial<{ nombre: string; precio: number }>) => patchAttr({ tamanos: sizes.map((x, j) => (j === i ? { ...x, ...s } : x)) })

  return (
    <Modal open onClose={onClose} title={isNew ? t('newTitle') : t('title')} size="full">
      <div className="h-full flex">
        <aside className="w-[220px] shrink-0 p-4 flex flex-col gap-1">
          {STEPS.map((s, i) => (
            <button key={s} type="button" role="tab" aria-selected={step === s} onClick={() => setStep(s)}
              className={cn('flex items-center gap-3 h-11 px-3 rounded-md text-[15px] font-semibold text-left', step === s ? 'bg-surface border border-border text-ink' : 'text-soft hover:bg-muted')}>
              <span className={cn('w-6 h-6 rounded-full grid place-items-center text-[13px]', step === s ? 'bg-primary text-primary-ink' : 'bg-muted text-soft')}>{i + 1}</span>{t(`steps.${s}`)}
            </button>
          ))}
        </aside>
        <section className="flex-1 min-w-0 m-4 ml-0 rounded-lg border border-border bg-surface flex flex-col overflow-hidden">
          <header className="h-14 px-5 flex items-center justify-between border-b border-border shrink-0">
            <h3 className="text-[16px] font-semibold text-ink">{t(step === 'info' ? 'infoTitle' : step === 'image' ? 'imageTitle' : 'attributesTitle')}</h3>
            {!isNew && <span className="text-[13px] text-soft truncate">{initial.name}</span>}
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
            {step === 'info' && (
              <>
                <TextInput label={t('name')} placeholder={t('namePlaceholder')} value={p.name} onChange={(e) => patch({ name: e.target.value })} />
                <fieldset className="flex flex-col gap-1.5"><legend className="text-[15px] font-medium mb-1.5">{t('categories')}</legend>
                  <div className="flex flex-wrap gap-2">{categories.map((c) => <Chip key={c.id} label={c.name} active={p.categoryIds.includes(c.id)} onClick={() => toggleCategory(c.id)} />)}</div>
                </fieldset>
                <Field label={t('description')}>{(id) => <textarea id={id} rows={3} placeholder={t('descriptionPlaceholder')} value={p.description} onChange={(e) => patch({ description: e.target.value })} className={cn(CONTROL, 'h-auto py-3 resize-none')} />}</Field>
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label={t('price')} type="number" inputMode="numeric" min={0} value={p.price} onChange={(e) => patch({ price: Number(e.target.value) })} className="tabular" />
                  <Select label={t('tax')} value={p.taxIds[0] ?? ''} onChange={(e) => patch({ taxIds: e.target.value ? [Number(e.target.value)] : [] })}>
                    <option value="">{t('noTax')}</option>{taxes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </Select>
                </div>
                {toggleRow(t('available'), t('availableHint'), p.available, (v) => patch({ available: v }))}
                {toggleRow(t('favorite'), t('favoriteHint'), p.favorite, (v) => patch({ favorite: v }))}
                {toggleRow(t('storable'), t('storableHint'), p.storable, (v) => patch({ storable: v }))}
              </>
            )}
            {step === 'image' && (
              <div className="flex items-start gap-6">
                <div className="w-[320px] aspect-[4/3] rounded-lg bg-muted overflow-hidden grid place-items-center text-dim">
                  {p.image
                    // eslint-disable-next-line @next/next/no-img-element -- base64 recién elegido; next/image no aplica a data URLs.
                    ? <img src={`data:image/*;base64,${p.image}`} alt="" className="w-full h-full object-cover" />
                    : hasImage && templateId
                      // eslint-disable-next-line @next/next/no-img-element -- foto servida por Odoo a través del proxy same-origin.
                      ? <img src={`/odoo/web/image/product.template/${templateId}/image_512`} alt="" className="w-full h-full object-cover" />
                      : <span className="flex flex-col items-center gap-2 text-[13px]"><Icon name="photo" size={36} />{t('noImage')}</span>}
                </div>
                <label className="flex flex-col gap-2 text-[15px] font-medium text-ink">{t('image')}
                  <input type="file" accept="image/*" aria-label={t('upload')} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => patch({ image: String(r.result).split(',')[1] }); r.readAsDataURL(f) }} className="text-sm font-normal" />
                  <span className="text-[13px] text-soft font-normal">{t('imageHint')}</span>
                </label>
              </div>
            )}
            {step === 'attributes' && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <TextInput label={t('pieces')} hint={t('piecesHint')} type="number" min={0} value={attrs.piezas ?? ''} onChange={(e) => patchAttr({ piezas: numOrUndefined(e.target.value) })} className="tabular" />
                  <TextInput label={t('abv')} type="number" min={0} step="0.1" value={attrs.abv ?? ''} onChange={(e) => patchAttr({ abv: numOrUndefined(e.target.value) })} className="tabular" />
                  <TextInput label={t('ibu')} type="number" min={0} value={attrs.ibu ?? ''} onChange={(e) => patchAttr({ ibu: numOrUndefined(e.target.value) })} className="tabular" />
                </div>
                <fieldset className="flex flex-col gap-1.5"><legend className="text-[15px] font-medium mb-1.5">{t('spicy')}</legend>
                  <div className="flex flex-wrap gap-2">{SPICY_LEVELS.map((l) => <Chip key={l} label={t(`spicyLevels.${l}`)} icon={l > 0 ? 'flame' : undefined} active={(attrs.picante ?? 0) === l} onClick={() => patchAttr({ picante: l as SpicyLevel })} />)}</div>
                </fieldset>
                <div className="grid grid-cols-2 gap-4">
                  <TextInput label={t('tags')} hint={t('tagsHint')} defaultValue={listToText(attrs.etiquetas)} onBlur={(e) => patchAttr({ etiquetas: textToList(e.target.value) })} />
                  <TextInput label={t('allergens')} hint={t('allergensHint')} defaultValue={listToText(attrs.alergenos)} onBlur={(e) => patchAttr({ alergenos: textToList(e.target.value) })} />
                </div>
                <fieldset className="flex flex-col gap-2"><legend className="text-[15px] font-medium mb-1.5">{t('sizes')}</legend>
                  {sizes.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_180px_auto] gap-3 items-end">
                      <TextInput label={t('sizeName')} value={s.nombre} onChange={(e) => setSize(i, { nombre: e.target.value })} />
                      <TextInput label={t('sizePrice')} type="number" min={0} value={s.precio} onChange={(e) => setSize(i, { precio: Number(e.target.value) })} className="tabular" />
                      <Button size="compact" aria-label={t('removeSize')} onClick={() => patchAttr({ tamanos: sizes.filter((_, j) => j !== i) })}><Icon name="trash" size={18} /></Button>
                    </div>
                  ))}
                  <Button size="compact" className="self-start" onClick={() => patchAttr({ tamanos: [...sizes, { nombre: '', precio: p.price }] })}><Icon name="plus" size={18} />{t('addSize')}</Button>
                </fieldset>
                {toggleRow(t('onlyToday'), t('onlyTodayHint'), attrs.soloHoy ?? false, (v) => patchAttr({ soloHoy: v }))}
              </>
            )}
          </div>
          <footer className="px-5 py-4 border-t border-border flex items-center gap-4 shrink-0">
            <Button variant="primary" onClick={save} disabled={state === 'saving' || !p.name.trim()}>{t('save')}</Button>
            {state === 'saved' && <p role="status" className="text-[14px] text-success-ink">{t('saved')}</p>}
            {state === 'error' && <p role="alert" className="text-[14px] text-danger-ink">{ui('error')}</p>}
          </footer>
        </section>
      </div>
    </Modal>
  )
}
