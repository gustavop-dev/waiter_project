'use client'

import { useEffect, useRef } from 'react'

import { play, setStation, type SoundId } from '@/lib/audio/sounds'
import type { NotificationKind } from '@/lib/domain/notifications'
import { getNotifyPrefs, type NotifyPrefs } from '@/lib/services/employees'
import { useAuthStore } from '@/lib/stores/authStore'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { toast } from '@/lib/stores/toastStore'

// Cinco segundos: la llamada es una sola y diminuta (49 KB/min con todo lo demás incluido), y es la que
// marca el ritmo de lo urgente. Los pedidos siguen releyéndose cada 10 s, pero un aviso nuevo los despierta
// en el acto, así que el sonido y la pantalla llegan juntos sin doblar el tráfico pesado.
const POLL_MS = 5_000
const SOUND: Record<NotificationKind, SoundId> = { kitchen: 'listo', inventory: 'demora', system: 'tap' }
const POPUP: Record<NotificationKind, keyof NotifyPrefs> = { kitchen: 'kitchen_popup', inventory: 'inventory_popup', system: 'system_popup' }
const SOUND_PREF: Record<NotificationKind, keyof NotifyPrefs> = { kitchen: 'kitchen_sound', inventory: 'inventory_sound', system: 'system_sound' }

// El mesero no vive mirando la pantalla: cuando cocina saca un plato hay que llamarle. Cada aviso nuevo
// suena y salta en pantalla según lo que el usuario tenga marcado en Ajustes › Notificaciones.
// La primera carga no suena: son los avisos que ya estaban, no novedades.
export function useNotificationAlerts() {
  const user = useAuthStore((s) => s.user)
  const items = useNotificationStore((s) => s.items)
  const refresh = useNotificationStore((s) => s.refresh)
  const poll = useNotificationStore((s) => s.poll)
  const prefs = useRef<NotifyPrefs | null>(null)
  const seen = useRef(new Set<number>())
  // Hasta que la primera carga termine no se avisa de nada: lo que ya estaba sin leer no es una novedad,
  // y sembrar con la lista vacía del arranque haría sonar todo el historial de golpe.
  const primed = useRef(false)

  useEffect(() => {
    setStation('tablet')
    primed.current = false
    seen.current = new Set()
    if (!user) { prefs.current = null; return }
    getNotifyPrefs(user.uid).then((p) => { prefs.current = p }).catch(() => undefined)
    void refresh().then(() => {
      useNotificationStore.getState().items.forEach((n) => seen.current.add(n.id))
      primed.current = true
    })
    const id = setInterval(() => void poll(), POLL_MS)
    return () => clearInterval(id)
  }, [user, refresh, poll])

  useEffect(() => {
    if (!user || !primed.current) return
    const fresh = items.filter((n) => !seen.current.has(n.id) && !n.read)
    items.forEach((n) => seen.current.add(n.id))
    if (fresh.length === 0) return
    const p = prefs.current
    // Un solo sonido por tanda, el del aviso más nuevo: dos platos a la vez no suenan dos veces.
    const kind = fresh[0].kind
    if (!p || p[SOUND_PREF[kind]]) play(SOUND[kind])
    fresh.filter((n) => !p || p[POPUP[n.kind]]).slice(0, 3).forEach((n) => toast({ title: n.title, body: n.body }))
  }, [items, user])
}
