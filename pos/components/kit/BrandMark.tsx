'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

// Marca de Waiter: el nombre y, debajo, de quién es el producto, en su placa azul. Es lo mismo en la barra
// superior del POS, en la pantalla de cocina y en el acceso, así que vive en un solo sitio. El azul es el
// del kit, así que la placa se lee igual sobre el lienzo claro y sobre el negro de cocina.
export function BrandMark({ href, size = 'sm', className }: { href?: string; size?: 'sm' | 'lg'; className?: string }) {
  const t = useTranslations('pos')
  const big = size === 'lg'
  const body = (
    <span className={cn('inline-flex flex-col justify-center leading-none bg-primary text-primary-ink',
      big ? 'px-5 py-3 rounded-2xl' : 'px-3 py-2 rounded-xl', className)}>
      <span className={cn('font-semibold tracking-[-0.02em]', big ? 'text-[28px]' : 'text-[19px]')}>{t('brand')}</span>
      <span className={cn('opacity-75 tracking-[0.01em]', big ? 'text-[12px] mt-1.5' : 'text-[10px] mt-1')}>{t('brandBy')}</span>
    </span>
  )
  if (!href) return <span aria-label={t('brand')}>{body}</span>
  return <Link href={href} aria-label={t('brand')} className="shrink-0">{body}</Link>
}
