'use client'
/* eslint-disable @next/next/no-img-element -- Original exported illustrations and restaurant logo. */
import Link from 'next/link'
import { useRef } from 'react'
import type { Entry } from '@/lib/types'
import { useDinerStore } from '@/lib/stores/dinerStore'
import { initials } from '@/lib/domain/template'
import { FoodPhoto, Icon, money, useSmartRoute } from './SmartMenu'

// Saludo de la cabecera: el texto lo fija el administrador (Diseño del menú → Saludo, campo `saludo` de la marca);
// vacío es «Hola». Con cuenta se añade el primer nombre. No es un enlace: la navegación vive en el botón de la derecha.
export function greeting(entry: Entry, accountName?: string | null) {
  const base = entry.contexto.marca.saludo?.trim() || 'Hola'
  const first = accountName?.trim().split(/\s+/)[0]
  return first ? `${base}, ${first}` : base
}

export function SmartHeader({ entry, current='portada' }: { entry: Entry;current?:'portada'|'carta' }) {
  const { href } = useSmartRoute()
  const account = useDinerStore(s => s.account)
  const dialog = useRef<HTMLDialogElement>(null)
  return <>
    <header className="sm-location-header">
      <div className="sm-greeting-line">
        {entry.contexto.marca.logo && <img src={entry.contexto.marca.logo} alt="" />}
        <div>
          <strong>{greeting(entry, account?.nombre)}</strong>
          <span>{entry.contexto.sede.nombre}{entry.contexto.mesa ? ` · Mesa ${entry.contexto.mesa.numero}` : ''}</span>
        </div>
      </div>
      <button aria-label="Abrir navegación" onClick={() => dialog.current?.showModal()}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M3 6h18M3 12h13M3 18h18"/></svg></button>
    </header>
    <dialog ref={dialog} className="sm-navigation" aria-label="Navegación principal" onClick={e => {if(e.target === e.currentTarget) dialog.current?.close()}}>
      <div className="sm-navigation-inner">
        <header><Link href={href('cuenta')} onClick={() => dialog.current?.close()} className="sm-profile-link"><span className="sm-avatar">{account ? initials(account.nombre) : <Icon name="user"/>}</span><span><span>{account?.nombre || 'Bienvenido'}</span><small>Mi perfil</small></span></Link><button className="sm-icon" aria-label="Cerrar navegación" onClick={() => dialog.current?.close()}><Icon name="close"/></button></header>
        <nav>{([['ubicacion','Restaurante y mesa'],['recompensas','Recompensas'],['carta','Menú'],['pedido','Pedido actual'],['historial','Mis pedidos'],['favoritos','Favoritos']] as const).map(([screen,label]) => <Link key={screen} aria-current={screen===current?'page':undefined} href={href(screen)} onClick={() => dialog.current?.close()}>{label}<Icon name="arrow"/></Link>)}</nav>
        <p>{entry.contexto.sede.nombre}{entry.contexto.mesa ? ` · Mesa ${entry.contexto.mesa.numero}` : ''}</p>
      </div>
    </dialog>
  </>
}

export function SmartHome({entry}: {entry: Entry}) {
  const {href} = useSmartRoute()
  const account = useDinerStore(s => s.account)
  const order = useDinerStore(s => s.order)
  const activeOrder = order && !['pagado','fallido'].includes(order.estado) ? order : null
  const dishes = [...new Map(entry.carta.categorias.flatMap(c=>c.productos).map(d=>[d.id,d])).values()].filter(d=>!d.agotado)
  return <>
    <SmartHeader entry={entry}/>
    <h1 className="sm-home-title">{activeOrder ? `Disfruta tu visita a ${entry.contexto.marca.nombre}` : account ? `${account.nombre.split(' ')[0]}, encontremos tu próximo plato favorito` : 'Encontremos el plato perfecto para ti'}</h1>
    {activeOrder ? <><Link href={href('estado',activeOrder.id)} className="sm-home-active">{dishes[0] && <FoodPhoto dish={dishes[0]}/>}<div><h2>Pedido activo</h2><p>Consulta cómo va tu pedido</p></div><span className="sm-home-arrow"><Icon name="arrow"/></span></Link>{entry.carta.categorias.filter(category=>category.productos.some(d=>!d.agotado)).slice(0,2).map(category=><section key={category.id}><div className="sm-section-heading"><h2>{category.nombre}</h2></div><div className="sm-food-rail">{category.productos.filter(d=>!d.agotado).slice(0,8).map(d=><Link className="sm-food-card sm-food-link" href={href('plato',d.id)} key={d.id}><FoodPhoto dish={d}/><h3>{d.nombre}</h3><div className="sm-food-bottom"><strong>{money(d.precio)}</strong></div></Link>)}</div></section>)}<Link className="sm-secondary" href={href('carta')}>Ver todo el menú<Icon name="arrow"/></Link></> : <div className="sm-home-options">
      <Link className="sm-home-card" href={href('carta')}><img src="/smart-menu/menu.png" alt=""/><h2>Ir al menú</h2><p>Si ya sabes qué se te antoja, esta es tu mejor opción</p><span className="sm-home-arrow"><Icon name="arrow"/></span></Link>
    </div>}
  </>
}
