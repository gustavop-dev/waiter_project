'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { Chip } from '@/components/kit/Chip'
import { Icon } from '@/components/kit/Icon'
import { ingredientImage } from '@/components/pantry/DishDetailModal'
import { INPUT, LABEL, PrimaryButton, WizardFrame } from '@/components/pantry/WizardFrame'
import { imageDataUrl, resizeImage, validateLogoFile } from '@/lib/domain/image'
import { KIT_UNITS, categoryEmoji, kitUnitKey, type Ingredient } from '@/lib/domain/pantry'
import { createIngredient, updateIngredient, type IngredientCategory, type Supplier, type Unit } from '@/lib/services/pantry'
import { toast } from '@/lib/stores/toastStore'
import { cn } from '@/lib/utils'

const PHOTO_MAX = { width: 512, height: 512 }
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

// "Add New Ingredients" del kit en dos pasos: datos (nombre, categoría, stock inicial, unidad, foto) y proveedor en rejilla.
// Con `initial` edita el ingrediente (Edit Ingredients del menú ⋯): mismo formulario con los valores actuales.
export function AddIngredientWizard({ open, onClose, initial = null, categories, units, suppliers, onSaved }: {
  open: boolean; onClose: () => void; initial?: Ingredient | null; categories: IngredientCategory[]; units: Unit[]; suppliers: Supplier[]; onSaved: () => Promise<void>
}) {
  const t = useTranslations('pantry.ingredientWizard')
  const ta = useTranslations('pantry.actions')
  const tu = useTranslations('pantry.units')
  const ts = useTranslations('pantry.search')
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initial?.name ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null)
  const [stock, setStock] = useState(initial ? String(initial.qty) : '')
  const [unitKey, setUnitKey] = useState<string | null>(initial ? kitUnitKey(initial.uomName) : null)
  const [image, setImage] = useState<string | undefined>(undefined)
  const [supplierId, setSupplierId] = useState<number | null>(initial?.supplierId ?? null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const unitId = (key: string | null) => (key === null ? null : units.find((u) => u.name === KIT_UNITS.find((k) => k.key === key)?.uom)?.id ?? null)

  function next() {
    if (!name.trim()) return setError(t('errors.name'))
    if (categoryId === null) return setError(t('errors.category'))
    if (stock !== '' && !(Number(stock) >= 0)) return setError(t('errors.stock'))
    if (unitId(unitKey) === null) return setError(t('errors.unit'))
    setError(null); setStep(1)
  }

  async function onFile(f: File | undefined) {
    if (!f) return
    if (validateLogoFile(f)) return setError(t('errors.photo'))
    setError(null); setImage(await resizeImage(f, PHOTO_MAX))
  }

  async function submit() {
    if (supplierId === null) return setError(t('errors.supplier'))
    setSaving(true); setError(null)
    const input = { name: name.trim(), categoryId: categoryId as number, uomId: unitId(unitKey) as number, stock: Number(stock || 0), image, supplierId }
    try {
      if (initial) await updateIngredient(initial, input); else await createIngredient(input)
      await onSaved()
      toast(initial ? { title: t('editedTitle'), body: t('editedBody') } : { title: t('successTitle'), body: t('successBody') })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setSaving(false) }
  }

  const visible = suppliers.filter((s) => s.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
  const preview = image ? imageDataUrl(image) : initial?.hasImage ? ingredientImage(initial.id) : null
  const footer = (
    <>
      {step === 0 ? <PrimaryButton onClick={next}>{ta('saveNext')}</PrimaryButton> : <PrimaryButton onClick={submit} disabled={saving}>{ta('saveSubmit')}</PrimaryButton>}
      {error && <p role="alert" className="text-[14px] text-danger-ink">{error}</p>}
    </>
  )
  const search = (
    <label className="h-10 w-[400px] px-3 rounded-md border border-border bg-surface flex items-center gap-2 text-soft">
      <Icon name="search" size={18} /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={ts('supplier')} aria-label={ts('supplier')} className="flex-1 min-w-0 bg-transparent text-[14px] text-ink placeholder:text-dim outline-none" />
    </label>
  )
  return (
    <WizardFrame open={open} onClose={onClose} title={initial ? t('editTitle') : t('title')} steps={[t('steps.info'), t('steps.supplier')]} current={step}
      paneTitle={step === 0 ? t('infoTitle') : t('supplierTitle')} paneAction={step === 1 ? search : undefined} footer={footer}>
      {step === 0 ? (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2"><span className={LABEL}>{t('name')}</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} className={INPUT} /></label>
          <div className="flex flex-col gap-2" role="group" aria-label={t('category')}>
            <span className={LABEL}>{t('category')}</span>
            <div className="flex flex-wrap gap-4 [&>button]:min-w-[120px] [&>button]:justify-center">{categories.map((c) => <Chip key={c.id} label={`${categoryEmoji(c.name)} ${c.name}`} active={c.id === categoryId} onClick={() => setCategoryId(c.id)} />)}</div>
          </div>
          <label className="flex flex-col gap-2"><span className={LABEL}>{t('initialStock')}</span><input type="number" min={0} step="any" value={stock} onChange={(e) => setStock(e.target.value)} placeholder={t('initialStockPlaceholder')} className={`${INPUT} max-w-[390px]`} /></label>
          <div className="flex flex-col gap-2" role="group" aria-label={t('unit')}>
            <span className={LABEL}>{t('unit')}</span>
            <div className="flex flex-wrap gap-4 [&>button]:min-w-[120px] [&>button]:justify-center">{KIT_UNITS.map((u) => <Chip key={u.key} label={tu(u.key)} active={u.key === unitKey} onClick={() => setUnitKey(u.key)} />)}</div>
          </div>
          <div className="flex flex-col gap-2">
            <span className={LABEL}>{t('photo')}</span>
            <input ref={file} type="file" accept="image/png,image/jpeg" className="hidden" aria-label={t('photo')} onChange={(e) => void onFile(e.target.files?.[0])} />
            <button type="button" onClick={() => file.current?.click()} className="h-[132px] rounded-md border border-dashed border-border bg-canvas flex items-center justify-center gap-4 text-center">
              {preview ? <img src={preview} alt="" className="h-24 w-24 rounded-sm object-cover" /> : <span className="w-12 h-12 rounded-full bg-surface border border-border grid place-items-center text-soft"><Icon name="upload" size={22} /></span>}
              <span className="flex flex-col gap-1 text-left">
                <span className="text-[15px] font-semibold text-ink">{preview ? t('photoChange') : t('photoTap')}<span className="font-normal text-soft"> {preview ? '' : t('photoTapBody')}</span></span>
                <span className="text-[13px] text-dim">{t('photoHint')}</span>
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4" role="radiogroup" aria-label={t('supplierTitle')}>
          {visible.length === 0 && <p className="col-span-4 text-[14px] text-soft">{t('noSuppliers')}</p>}
          {visible.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === supplierId} onClick={() => setSupplierId(s.id)}
              className={cn('h-[140px] rounded-md border bg-surface flex flex-col items-center justify-center gap-3 px-3', s.id === supplierId ? 'border-primary' : 'border-border')}>
              <span className="w-16 h-16 rounded-full bg-primary-soft text-primary grid place-items-center text-[20px] font-semibold overflow-hidden">
                {s.hasImage ? <img src={`/odoo/web/image/res.partner/${s.id}/image_128`} alt="" className="w-full h-full object-cover" /> : initials(s.name)}
              </span>
              <span className="text-[15px] font-semibold text-ink text-center leading-tight">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </WizardFrame>
  )
}
