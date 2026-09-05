'use client'

import type { Entry } from '@/lib/types'

// Pendiente (Plan F, tarea 3-5). Cada pantalla es un archivo con dueño propio.
export function Dish({ entry }: { entry: Entry; rest: string; venue: string; token: string | null; id: string | null }) {
  return <p className="p-[18px] text-soft">{entry.contexto.marca.nombre} · Dish</p>
}
