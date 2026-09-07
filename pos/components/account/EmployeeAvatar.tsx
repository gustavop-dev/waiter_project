'use client'

import { useState } from 'react'

import { initials } from '@/components/layout/Sidebar'
import { cn } from '@/lib/utils'

// Foto del empleado desde Odoo (avatar_128 trae iniciales generadas si no hay foto); si el terminal no puede leerla, iniciales locales.
export function EmployeeAvatar({ id, name, size = 44, className }: { id: number; name: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false)
  const style = { width: size, height: size }
  if (broken) return <span style={style} className={cn('shrink-0 rounded-md bg-primary-soft text-primary grid place-items-center font-semibold', className)}>{initials(name)}</span>
  // eslint-disable-next-line @next/next/no-img-element -- imagen servida por el proxy de Odoo, sin optimizador.
  return <img src={`/odoo/web/image/hr.employee/${id}/avatar_128`} alt="" width={size} height={size} onError={() => setBroken(true)} style={style} className={cn('shrink-0 rounded-md object-cover bg-muted', className)} />
}
