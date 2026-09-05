'use client'

import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'

import { loadBrandFonts, loadTemplateFonts } from '@/components/settings/googleFonts'
import { SaveBar, useSaveState } from '@/components/settings/SettingsForms'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextInput } from '@/components/ui/Field'
import { FONTS, MIN_CONTRAST, contrast, inkFor, isHex } from '@/lib/domain/brand'
import { DEFAULT_TEMPLATE, gateway, listTemplates, previewUrl, type ColorToken, type Family, type MenuSettings, type MenuSettingsContext, type TemplateCatalog, type TemplateSpec } from '@/lib/services/menuTemplates'
import { cn } from '@/lib/utils'

// Configuración › Plantilla del menú (Plan H, Contrato 5). El POS solo elige y personaliza: el catálogo lo sirve
// experience, la elección se guarda por la pasarela del addon y la vista previa es la app del comensal de verdad
// (iframe con ?vista_previa=). Solo viajan los colores y la fuente que el restaurante pisó; lo demás lo resuelve
// experience con la plantilla y la marca del Plan G.
const PREVIEW_DEBOUNCE_MS = 400
const PREVIEW_WIDTH = 360
const PREVIEW_HEIGHT = 720

type Palette = Partial<Record<ColorToken, string>>
const errorMessage = (e: unknown) => (e instanceof Error && e.message ? e.message : String(e))

// El catálogo recibido ya incorpora la marca de la sede. Conservar los colores explícitos,
// aunque coincidan con ese catálogo; borrar una clave restaura la misma base que se previsualiza.
function toSettings(spec: TemplateSpec, palette: Palette, font: string): MenuSettings {
  const paleta: Palette = {}
  for (const token of spec.personalizable.colores) {
    const raw = palette[token]
    if (raw !== undefined && isHex(raw)) paleta[token] = raw.toUpperCase()
  }
  return { plantilla: spec.codigo, paleta, tipografia: font && font !== spec.tokens.displayFont ? { display: font } : {} }
}

export function MenuTemplateForm() {
  const t = useTranslations('pos.settings.menuTemplate')
  const ui = useTranslations('pos.ui')
  const ids = useId()
  const [ctx, setCtx] = useState<MenuSettingsContext | null>(null)
  const [catalog, setCatalog] = useState<TemplateCatalog | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [code, setCode] = useState(DEFAULT_TEMPLATE)
  const [family, setFamily] = useState<Family>('B')
  const [palette, setPalette] = useState<Palette>({})
  const [font, setFont] = useState('')
  // Lo que ve el iframe: sigue a los ajustes con un retraso para no recargar al comensal en cada tecla.
  const [previewSettings, setPreviewSettings] = useState<MenuSettings | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [state, save] = useSaveState()

  useEffect(() => { loadBrandFonts() }, [])

  useEffect(() => {
    let alive = true
    void gateway('get').then(async (c) => {
      const cat = await listTemplates(c.experienceUrl, c.restaurante, c.sede)
      if (!alive) return
      const saved = c.ajustes
      const initial = cat.plantillas.find((p) => p.codigo === saved?.plantilla) ?? cat.plantillas.find((p) => p.codigo === DEFAULT_TEMPLATE) ?? cat.plantillas[0]
      setCtx(c)
      setCatalog(cat)
      if (initial) {
        setCode(initial.codigo)
        setFamily(initial.familia)
        if (saved?.plantilla === initial.codigo) { setPalette(saved.paleta ?? {}); setFont(saved.tipografia?.display ?? '') }
      }
    }).catch((e: unknown) => { if (alive) setFailed(errorMessage(e)) })
    return () => { alive = false }
  }, [])

  const spec = useMemo(() => catalog?.plantillas.find((p) => p.codigo === code) ?? null, [catalog, code])
  useEffect(() => { if (spec) loadTemplateFonts(spec.fuentesGoogle) }, [spec])

  const settingsKey = spec ? JSON.stringify(toSettings(spec, palette, font)) : null
  useEffect(() => {
    if (!settingsKey) return
    const id = setTimeout(() => setPreviewSettings(JSON.parse(settingsKey) as MenuSettings), PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [settingsKey])

  if (failed) return <p role="alert" className="text-[15px] text-busy-ink">{t('loadFailed', { reason: failed })}</p>
  if (!ctx || !catalog || !spec) return <p className="text-[15px] text-soft">{ui('loading')}</p>

  const families = (Object.keys(catalog.familias) as Family[]).sort()
  const shown = catalog.plantillas.filter((p) => p.familia === family)
  // Elegir otra plantilla parte de su diseño; volver a la guardada recupera lo que el restaurante ya había pisado.
  const choose = (p: TemplateSpec) => {
    setCode(p.codigo)
    const saved = ctx.ajustes
    if (saved?.plantilla === p.codigo) { setPalette(saved.paleta ?? {}); setFont(saved.tipografia?.display ?? '') } else { setPalette({}); setFont('') }
  }
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = families.indexOf(family)
    const next = e.key === 'ArrowRight' ? families[(i + 1) % families.length] : e.key === 'ArrowLeft' ? families[(i - 1 + families.length) % families.length] : null
    if (!next) return
    e.preventDefault()
    setFamily(next)
    document.getElementById(`${ids}-tab-${next}`)?.focus()
  }

  const raw = (token: ColorToken) => palette[token] ?? spec.tokens[token]
  const effective = (token: ColorToken) => { const v = palette[token]; return v !== undefined && isHex(v) ? v.toUpperCase() : spec.tokens[token] }
  const setColor = (token: ColorToken, value: string) => { const c = value.trim(); setPalette((p) => ({ ...p, [token]: isHex(c) ? c.toUpperCase() : c })) }
  const resetColor = (token: ColorToken) => setPalette((p) => { const { [token]: _omit, ...rest } = p; void _omit; return rest })
  const hexOk = spec.personalizable.colores.every((token) => { const v = palette[token]; return v === undefined || isHex(v) })
  const acento = effective('acento')
  // El texto sobre la acción lo calcula la misma regla que la marca (Plan G): experience resuelve acentoTinta igual.
  const actionRatio = contrast(acento, inkFor(acento))
  const textRatio = contrast(effective('tinta'), effective('fondo'))
  const overridden = (token: ColorToken) => { const v = palette[token]; return v !== undefined && isHex(v) }
  // Se bloquea solo lo que el restaurante pisó: un valor del diseño que no llega a 4.5 se señala, pero no impide
  // guardar la plantilla tal cual (la valida experience contra el catálogo).
  const contrastOk = !(actionRatio < MIN_CONTRAST && overridden('acento')) && !(textRatio < MIN_CONTRAST && (overridden('tinta') || overridden('fondo')))
  const fontOptions: string[] = (FONTS as readonly string[]).includes(spec.tokens.displayFont) ? [...FONTS] : [spec.tokens.displayFont, ...FONTS]
  const settings = toSettings(spec, palette, font)
  const src = previewSettings ? previewUrl(ctx.dinerUrl, ctx.restaurante, ctx.sede, previewSettings) : null

  const onSave = () => {
    setSaveError(null)
    return save(async () => {
      try { await gateway('set', settings) } catch (e) { setSaveError(errorMessage(e)); throw e }
      setCtx((c) => c && { ...c, ajustes: settings })
    })
  }

  const readout = (ok: boolean, text: string) => ok
    ? <p className="flex items-center gap-1.5 text-[13px] text-free-ink"><CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden />{text}</p>
    : <p role="alert" className="flex items-start gap-1.5 text-[13px] text-busy-ink"><ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{text} · {t('noContrast')}</p>

  return (
    <div>
      <p className="mb-5 max-w-2xl text-[15px] text-soft">{t('help')}</p>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div role="tablist" aria-label={t('families')} className="flex flex-wrap gap-2">
            {families.map((f) => {
              const on = f === family
              return (
                <button key={f} id={`${ids}-tab-${f}`} type="button" role="tab" aria-selected={on} aria-controls={`${ids}-panel`} tabIndex={on ? 0 : -1} onClick={() => setFamily(f)} onKeyDown={onTabKey}
                  className={cn('h-tap-min rounded-full border px-4 text-[15px] flex items-center gap-2', on ? 'bg-ink text-canvas border-ink font-bold' : 'bg-surface border-border hover:bg-muted')}>
                  <span className={cn('font-mono text-[13px]', on ? 'opacity-70' : 'text-soft')}>{f}</span>{catalog.familias[f]}
                </button>
              )
            })}
          </div>
          <div id={`${ids}-panel`} role="tabpanel" aria-label={t('gallery', { family: catalog.familias[family] })} className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
            {shown.map((p) => {
              const on = p.codigo === code
              return (
                <button key={p.codigo} type="button" aria-pressed={on} onClick={() => choose(p)}
                  className={cn('flex flex-col overflow-hidden rounded-[14px] border-2 bg-surface text-left focus-visible:outline-2 focus-visible:outline-brand-500', on ? 'border-brand-500' : 'border-border hover:border-ink-3')}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- la miniatura la sirve experience (otro origen, PNG estático con caché larga); con images.unoptimized next/image no aporta nada y exigiría registrar el host. */}
                  <img src={ctx.experienceUrl.replace(/\/+$/, '') + p.miniatura} alt="" loading="lazy" width={744} height={1040} className="aspect-[93/130] w-full bg-muted object-cover object-top" />
                  <div className="flex flex-col gap-1.5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-bold leading-[1.25]">{p.nombre}</span>
                      {on && <CheckCircleIcon className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />}
                      {on && <span className="sr-only">{t('current')}</span>}
                    </div>
                    <span className="text-[13px] leading-[1.35] text-soft">{p.descripcion}</span>
                    <span className="mt-1 inline-flex h-6 w-fit items-center rounded-full bg-muted px-2 text-[12px] font-medium text-soft">{t('photos', { need: t(`photoNeed.${p.fotos.requiere}`) })}</span>
                  </div>
                </button>
              )
            })}
          </div>
          <section aria-labelledby={`${ids}-customize`} className="flex max-w-md flex-col gap-4 rounded-[18px] border border-border bg-surface p-5">
            <div className="flex flex-col gap-1">
              <h3 id={`${ids}-customize`} className="text-[17px] font-bold">{t('customize')} · {spec.nombre}</h3>
              <p className="text-[13px] text-soft">{t('customizeHint')}</p>
            </div>
            {spec.personalizable.colores.map((token) => {
              const label = t(`colors.${token}`)
              const valid = palette[token] === undefined || isHex(palette[token] ?? '')
              return (
                <div key={token} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label={label}>{(id) => <input id={id} type="color" value={effective(token).toLowerCase()} onChange={(e) => setColor(token, e.target.value)} className="h-tap-min w-tap-min cursor-pointer rounded-[10px] border border-border bg-surface p-1" />}</Field>
                    <TextInput label={t('hex', { color: label })} value={raw(token)} onChange={(e) => setColor(token, e.target.value)} maxLength={7} spellCheck={false} autoCapitalize="characters" className="w-40 font-mono uppercase" />
                    {palette[token] !== undefined && <Button size="compact" onClick={() => resetColor(token)}>{t('reset')}</Button>}
                  </div>
                  {!valid && <p role="alert" className="text-[13px] text-busy-ink">{t('invalidHex')}</p>}
                </div>
              )
            })}
            <div className="flex flex-col gap-1">
              {readout(actionRatio >= MIN_CONTRAST, t('contrastAction', { ratio: actionRatio.toFixed(2) }))}
              {readout(textRatio >= MIN_CONTRAST, t('contrastText', { ratio: textRatio.toFixed(2) }))}
            </div>
            {spec.personalizable.tipografiaDisplay && (
              <Select label={t('font')} value={font || spec.tokens.displayFont} onChange={(e) => setFont(e.target.value === spec.tokens.displayFont ? '' : e.target.value)} style={{ fontFamily: `'${font || spec.tokens.displayFont}', serif` }}>
                {fontOptions.map((f) => <option key={f} value={f} style={{ fontFamily: `'${f}', serif` }}>{f === spec.tokens.displayFont ? t('fontOfTemplate', { font: f }) : f}</option>)}
              </Select>
            )}
            <SaveBar state={state} onSave={onSave} disabled={!hexOk || !contrastOk} error={saveError} />
          </section>
        </div>
        <aside aria-label={t('preview')} className="flex flex-col gap-2 self-start xl:sticky xl:top-0">
          <span className="text-[13px] font-medium uppercase tracking-[0.1em] text-ink-3">{t('preview')}</span>
          {/* key: cambiar los ajustes recarga el iframe entero (la vista previa vive en la URL). */}
          {src && <iframe key={src} title={t('preview')} src={src} width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} className="max-w-full rounded-[22px] border border-[#E4DED4] bg-surface" />}
          <p className="text-[13px] text-soft">{t('previewHint')}</p>
        </aside>
      </div>
    </div>
  )
}
