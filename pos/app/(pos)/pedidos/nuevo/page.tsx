'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import { OrderWizard } from '@/components/orders/OrderWizard'

// "Create New Order" del kit. Con ?mesa=<id> el wizard salta el paso de mesa (se entra desde el plano del salón).
function NewOrder() {
  const mesa = useSearchParams().get('mesa')
  const tableId = mesa && Number.isFinite(Number(mesa)) ? Number(mesa) : null
  return <OrderWizard presetTableId={tableId} />
}

export default function NuevoPedidoPage() {
  return <><Suspense>{<NewOrder />}</Suspense></>
}
