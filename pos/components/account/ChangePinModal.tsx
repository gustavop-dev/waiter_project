'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { Modal } from '@/components/kit/Modal'
import { NumericKeypad } from '@/components/kit/NumericKeypad'
import { PinInput } from '@/components/kit/PinInput'
import { Button } from '@/components/ui/Button'
import { changePin } from '@/lib/services/employees'

const PIN_LENGTH = 6

// "Change PIN" y "Change PIN Successful!" del kit (Account Setting): seis casillas, teclado y confirmación.
export function ChangePinModal({ open, employeeId, onClose }: { open: boolean; employeeId: number; onClose: () => void }) {
  const t = useTranslations('account.settings.security')
  const [pin, setPin] = useState('')
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const close = () => { setPin(''); setDone(false); setFailed(false); onClose() }

  async function submit() {
    setBusy(true); setFailed(false)
    try { await changePin(employeeId, pin); setDone(true) } catch { setFailed(true) } finally { setBusy(false) }
  }

  if (done) {
    return (
      <Modal open={open} onClose={close}>
        <div className="p-8 flex flex-col items-center text-center gap-4">
          <span className="w-20 h-20 rounded-full bg-primary text-primary-ink grid place-items-center"><Icon name="check" size={40} /></span>
          <p className="mt-2 text-[20px] font-semibold text-ink">{t('successTitle')}</p>
          <p className="text-[14px] text-soft">{t('successBody')}</p>
          <Button variant="primary" className="mt-2 w-full h-12 text-[17px]" onClick={close}>{t('ok')}</Button>
        </div>
      </Modal>
    )
  }
  return (
    <Modal open={open} onClose={close} title={t('changePin')}>
      <div className="p-6 flex flex-col items-center gap-6">
        <p className="text-[17px] text-ink">{t('newPin')}</p>
        <PinInput value={pin} label={t('newPin')} />
        {failed && <p role="alert" className="text-[14px] text-danger-ink">{t('failed')}</p>}
        <NumericKeypad onDigit={(d) => setPin((p) => (p + d).slice(0, PIN_LENGTH))} onBackspace={() => setPin((p) => p.slice(0, -1))} disabled={busy} />
        <Button variant="primary" className="w-full h-12 text-[17px]" disabled={busy || pin.length !== PIN_LENGTH} onClick={() => void submit()}>{t('changePin')}</Button>
      </div>
    </Modal>
  )
}
