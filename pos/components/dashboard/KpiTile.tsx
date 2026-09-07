import { Icon, type KitIcon } from '@/components/kit/Icon'

// Tarjeta KPI del kit (Dashboard / Filled.png): etiqueta, icono azul en recuadro y valor grande.
export function KpiTile({ label, value, icon }: { label: string; value: string; icon: KitIcon }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col justify-between gap-3 overflow-hidden relative isolate">
      {/* El halo azul del kit vive detrás del texto: sin la capa propia taparía la cifra cuando la etiqueta ocupa dos líneas. */}
      <span aria-hidden="true" className="absolute -left-3 -bottom-6 -z-10 w-24 h-12 rounded-full bg-primary-soft/70" />
      <div className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-semibold text-soft leading-tight">{label}</span>
        <span className="w-10 h-10 shrink-0 rounded-md border border-border bg-surface grid place-items-center text-primary"><Icon name={icon} size={20} /></span>
      </div>
      <span className="text-[28px] leading-none font-semibold text-ink tabular">{value}</span>
    </div>
  )
}
