'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { WizardSteps } from '@/components/kit/WizardSteps'
import { CustomerStep } from '@/components/orders/CustomerStep'
import { MenuStep } from '@/components/orders/MenuStep'
import { SummaryStep } from '@/components/orders/SummaryStep'
import { TableStep } from '@/components/orders/TableStep'
import { PaymentModal } from '@/components/payment/PaymentModal'
import { cartTotals, displayReference, stepsFor, type OptionGroup } from '@/lib/domain/orderWizard'
import { can, effectiveRole, type Role } from '@/lib/domain/roles'
import { callKw } from '@/lib/services/odoo'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useOrderStore } from '@/lib/stores/orderStore'
import { currentStep, useOrderWizardStore } from '@/lib/stores/orderWizardStore'
import { toast } from '@/lib/stores/toastStore'

const NO_GROUPS: OptionGroup[] = []

// Wizard "Create New Order" del kit (carpeta 5): cabecera de pasos, contenido a pantalla completa y salida a /pedidos.
// Si la mesa llega del plano, su paso se salta: ya se eligió, y volver a pedirla es preguntar dos veces lo mismo.
// Se puede confiar en ella porque el plano ahora obliga a elegirla a propósito (nunca hereda la última tocada),
// y el resumen la enseña antes de crear el pedido.
export function OrderWizard({ presetTableId }: { presetTableId: number | null }) {
  const t = useTranslations('orders.create')
  const router = useRouter()
  const session = useAuthStore((s) => s.session)
  const catalog = useCatalogStore((s) => s.catalog)
  const { openOrders, refreshOpenOrders } = useOrderStore()
  const w = useOrderWizardStore()
  const [paying, setPaying] = useState<number | null>(null)

  useEffect(() => { w.reset({ tableId: presetTableId }) }, [presetTableId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (catalog) void w.loadExtras(catalog) }, [catalog]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (session) void refreshOpenOrders(session.id) }, [session, refreshOpenOrders])

  const skipTable = presetTableId !== null
  const step = currentStep(w)
  const visible = stepsFor(w.info.type).filter((s) => !(skipTable && s === 'table'))
  const totals = useMemo(() => cartTotals(w.lines, w.taxes), [w.lines, w.taxes])
  const tableNumber = catalog?.tables.find((x) => x.id === w.tableId)?.number ?? null

  function forward() {
    w.next()
    if (skipTable && currentStep(useOrderWizardStore.getState()) === 'table') w.next()
  }
  function backward() {
    w.back()
    if (skipTable && currentStep(useOrderWizardStore.getState()) === 'table') w.back()
  }

  function leave(created: { trackingNumber: string } | null) {
    if (created) toast({ title: t('successTitle', { ref: displayReference(w.info.type, created.trackingNumber) }), body: t('successBody') })
    router.push('/pedidos')
  }

  async function confirm() {
    if (!session) return
    const created = await w.createOrder(session.id, { babyChair: t('babyChairNote'), delivery: (address, phone) => t('deliveryNote', { address, phone }) })
    if (!created) return
    if (w.info.type === 'dineIn') {
      try {
        const policy = await callKw<{ require_payment_roles: Role[] }>('pos.config', 'waiter_kitchen_policy', [[catalog!.settings.configId]])
        const auth = useAuthStore.getState()
        const role = effectiveRole(auth.user?.role, auth.employee?.role)
        if (policy.require_payment_roles.includes(role)) {
          if (!can.charge(role, catalog!.settings.waiterCanCharge)) {
            useOrderWizardStore.setState({ error: 'Pedido guardado. Pide a caja que lo cobre para enviarlo a cocina.' })
            return
          }
          setPaying(created.id)
          return
        }
      } catch (e) {
        useOrderWizardStore.setState({ error: e instanceof Error ? e.message : 'No se pudo comprobar el permiso de cocina.' })
        return
      }
      if (!await w.fireKitchen(created.id)) return
      leave(created)
      return
    }
    setPaying(created.id)
    forward()
  }

  if (!catalog) return null

  return (
    <div className="flex-1 min-h-0 p-3">
      <div className="h-full bg-canvas border border-border rounded-xl flex flex-col overflow-hidden">
        <header className="h-[72px] px-6 flex items-center gap-4 bg-surface border-b border-border shrink-0">
          {w.stepIndex > 0 && (
            <button type="button" aria-label={t('back')} onClick={backward} className="w-10 h-10 rounded-md bg-ink text-surface grid place-items-center shrink-0"><Icon name="chevronLeft" size={20} /></button>
          )}
          <div className="min-w-0 overflow-x-auto"><WizardSteps steps={visible.map((s) => t(`steps.${s}`))} current={Math.max(0, visible.indexOf(step))} /></div>
          <button type="button" aria-label={t('close')} onClick={() => router.push('/pedidos')} className="ml-auto w-10 h-10 rounded-md bg-ink text-surface grid place-items-center shrink-0"><Icon name="close" size={20} /></button>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden">
          {step === 'customer' && <CustomerStep info={w.info} onChange={w.setInfo} onContinue={forward} />}
          {step === 'table' && (
            <TableStep floors={catalog.floors} tables={catalog.tables} orders={openOrders} selected={w.tableId}
              onSelect={w.setTable} onContinue={forward} />
          )}
          {step === 'menu' && (
            <MenuStep products={catalog.products} categories={catalog.categories} taxes={w.taxes}
              optionsOf={(id) => w.extras?.options.get(id) ?? NO_GROUPS} descriptionOf={(id) => w.extras?.descriptions.get(id) ?? ''}
              lines={w.lines} onAdd={w.add} onUpdate={w.update} onQty={w.setQty} onReset={w.clear} onContinue={forward} />
          )}
          {step === 'summary' && (
            <SummaryStep info={w.info} tableNumber={tableNumber} lines={w.lines} totals={totals} busy={w.busy} error={w.error} onConfirm={() => void confirm()} />
          )}
          {step === 'payment' && !paying && <p className="p-8 text-[15px] text-soft">{t('creating')}</p>}
        </div>
      </div>

      {paying !== null && (
        <PaymentModal orderId={paying} onClose={() => setPaying(null)}
          onPaid={() => { const created = w.created; void w.fireKitchen(paying).then((sent) => { if (sent) leave(created) }) }} />
      )}
    </div>
  )
}
