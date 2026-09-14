'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Select, TextInput } from '@/components/ui/Field'
import { getPaymentGateways, savePaymentGateway, testPaymentGateway, type GatewaySettings, type GatewayEnvironment } from '@/lib/services/paymentGateways'
import type { PaymentMethodInfo } from '@/lib/services/settings'

const empty = { public_key: '', private_key: '', events: '', integrity: '', enabled: false, payment_method_id: '' }
export function PaymentGatewayForm({ methods }: { methods: PaymentMethodInfo[] }) {
  const [settings, setSettings] = useState<GatewaySettings | null>(null)
  const [environment, setEnvironment] = useState<GatewayEnvironment>('test')
  const [draft, setDraft] = useState(empty)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const current = settings?.configurations.find(c => c.environment === environment)
  useEffect(() => { let active = true; getPaymentGateways().then(s => { if(active)setSettings(s) }).catch(() => { if(active)setError('No se pudo cargar la configuración de pasarelas.') }); return () => { active = false } }, [])
  useEffect(() => { setDraft({ ...empty, public_key: current?.public_key ?? '', enabled: current?.enabled ?? false, payment_method_id: current?.payment_method_id?.toString() ?? '' }) }, [current])
  const run = async (action: 'save' | 'test') => {
    setBusy(true); setError(''); setNotice('')
    try {
      if (action === 'save') {
        setSettings(await savePaymentGateway({ ...draft, environment, payment_method_id: draft.payment_method_id ? Number(draft.payment_method_id) : null }))
        setNotice('Configuración guardada. Los secretos quedan cifrados y no se muestran de nuevo.')
      } else {
        const result = await testPaymentGateway(environment)
        setNotice(`Comercio: ${result.name || 'Conectado'}. ${result.detail}`)
      }
    } catch(e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.') } finally { setBusy(false) }
  }
  return <section className="mt-6 border border-border rounded-lg p-5 max-w-3xl flex flex-col gap-4">
    <div><h3 className="font-semibold text-lg">Pagos en línea · Wompi</h3><p className="text-sm text-soft mt-1">Bancolombia, QR con el valor de la cuenta, Nequi y tarjetas desde el menú.</p></div>
    {error && <p role="alert" className="text-danger">{error}</p>}{notice && <p role="status" className="text-sm">{notice}</p>}
    {settings && <form className="flex flex-col gap-4" autoComplete="off" onSubmit={e => { e.preventDefault(); void run('save') }}>
      <Select aria-label="Ambiente" label="Ambiente" value={environment} disabled={busy} onChange={e => {setEnvironment(e.target.value as GatewayEnvironment); setNotice(''); setError('')}}><option value="test">Sandbox · Sin dinero real</option><option value="prod">Producción · Dinero real</option></Select>
      <fieldset disabled={busy} className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TextInput label="Llave pública" value={draft.public_key} placeholder={`pub_${environment}_…`} onChange={e => setDraft({...draft, public_key:e.target.value})} autoComplete="off" spellCheck={false}/>
        {(['private_key', 'events', 'integrity'] as const).map(key => <TextInput key={key} type="password" autoComplete="new-password" spellCheck={false} label={{private_key:'Llave privada',events:'Secreto de eventos',integrity:'Secreto de integridad'}[key]} value={draft[key]} placeholder={current?.configured[key] ? 'Guardado · Vacío para conservar' : 'Sin configurar'} onChange={e => setDraft({...draft,[key]:e.target.value})}/>)}
      </fieldset>
      <Select label="Medio de pago para registrar en el POS" value={draft.payment_method_id} disabled={busy} onChange={e=>setDraft({...draft,payment_method_id:e.target.value})}><option value="">Selecciona un medio bancario</option>{methods.filter(m=>m.type==='bank').map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</Select>
      {environment==='prod'&&!settings.live_available&&<p className="text-sm text-soft">Puedes guardar las credenciales. La activación de cobros reales queda pendiente de validar la integración.</p>}
      <label className="flex gap-2 items-center"><input type="checkbox" checked={draft.enabled} disabled={busy||(environment==='prod'&&!settings.live_available)} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>Habilitar este ambiente en el menú</label>
      <p className="text-sm text-soft">Solo un ambiente puede estar habilitado. En sandbox el POS conserva la cuenta sin cobrar.</p>
      <div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy}>Guardar credenciales</Button><Button type="button" variant="secondary" disabled={busy||!current?.public_key} onClick={()=>void run('test')}>Comprobar comercio guardado</Button></div>
      <div className="bg-canvas rounded-md p-3 text-sm break-all"><strong>URL de eventos en Wompi</strong><p className="mt-1">{current?.webhook_url ?? 'Pendiente de configurar el dominio público HTTPS del servidor.'}</p>{!current?.webhook_url&&<p className="text-soft mt-1">La red local permite probar desde el navegador; Wompi necesita una dirección pública para notificar los pagos.</p>}</div>
    </form>}
  </section>
}
