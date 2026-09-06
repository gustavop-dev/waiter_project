'use client'

import { useState } from 'react'

import { Card } from '@/components/kit/Card'
import { Chip } from '@/components/kit/Chip'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { KitShell } from '@/components/kit/KitShell'
import { Modal } from '@/components/kit/Modal'
import { NumericKeypad } from '@/components/kit/NumericKeypad'
import { PinInput } from '@/components/kit/PinInput'
import { StatusPill, type PillTone } from '@/components/kit/StatusPill'
import { Toggle } from '@/components/kit/Toggle'
import { WizardSteps } from '@/components/kit/WizardSteps'
import { Button } from '@/components/ui/Button'
import { toast } from '@/lib/stores/toastStore'

const TONES: PillTone[] = ['progress', 'success', 'info', 'danger', 'reserved', 'neutral']

// Galería de desarrollo (solo admin): cada bloque se coteja con su PNG del kit en docs/diseno/pos-kit/pantallas.
export default function KitPage() {
  const [pin, setPin] = useState('')
  const [on, setOn] = useState(true)
  const [modal, setModal] = useState<'center' | 'wide' | 'full' | null>(null)
  return (
    <KitShell>
      <div className="p-6 grid grid-cols-2 gap-6 overflow-auto">
        <Card title="Chips y estados" action={<Button size="compact" onClick={() => toast({ title: '¡Pedido #DI001 enviado!', body: 'Va camino a cocina.' })}>Toast</Button>}>
          <div className="p-5 flex flex-wrap gap-2"><Chip label="Todos" count={20} active /><Chip label="En progreso" count={11} /><Chip label="Listos" count={5} icon="check" /></div>
          <div className="p-5 pt-0 flex flex-wrap gap-2">{TONES.map((t) => <StatusPill key={t} tone={t} icon="clock">{t}</StatusPill>)}</div>
          <div className="p-5 pt-0"><Toggle checked={on} onChange={setOn} label="Sonido" /></div>
        </Card>
        <Card title="Teclado y PIN"><div className="p-5 flex flex-col items-center gap-4"><PinInput value={pin} label="PIN" /><NumericKeypad onDigit={(d) => setPin((p) => (p + d).slice(0, 6))} onBackspace={() => setPin((p) => p.slice(0, -1))} /></div></Card>
        <Card title="Pasos y modales">
          <div className="p-5 flex flex-col gap-4"><WizardSteps steps={['Datos del cliente', 'Mesa', 'Menú', 'Resumen']} current={1} />
            <div className="flex gap-2"><Button onClick={() => setModal('center')}>Centrado</Button><Button onClick={() => setModal('wide')}>Ancho</Button><Button onClick={() => setModal('full')}>Completo</Button></div></div>
        </Card>
        <Card title="Estado vacío"><KitEmptyState icon="cart" title="No hay pedidos" body="Cuando se cree un pedido, el último aparecerá aquí." /></Card>
      </div>
      <Modal open={modal !== null} onClose={() => setModal(null)} title="Detalle" size={modal ?? 'center'}><div className="p-6">Contenido del modal {modal}</div></Modal>
    </KitShell>
  )
}
