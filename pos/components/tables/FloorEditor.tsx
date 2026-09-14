'use client'

import { useEffect, useRef, useState } from 'react'
import { CELL, extent, invalidTable, normalizePlan, planFits, snap, zoneAt, type FloorDocument, type PlanRect } from '@/lib/domain/floorPlan'
import { TableShape } from '@/components/tables/TableShape'
import { savePlan } from '@/lib/services/floorPlan'
import { checkPin } from '@/lib/services/employees'
import { useAuthStore } from '@/lib/stores/authStore'
import { uuid } from '@/lib/domain/uuid'
import { cn } from '@/lib/utils'

type Selection = { kind: 'tables' | 'walls' | 'zones' | 'background'; id: string } | null
type Camera = { x: number; y: number; zoom: number }
type Gesture = { type: 'pan' | 'move' | 'resize' | 'draw'; start: {x: number; y: number}; camera: Camera; original?: PlanRect; selection?: Selection; before: FloorDocument }
const keyOf = (item: {key?: string; id?: string | number | null}) => item.key ?? String(item.id)
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4']
const inputClass = 'w-full rounded-md border border-border bg-surface p-2 text-sm text-ink'

export function FloorEditor({ initial, configId, background, onCancel, onSaved }: { initial: FloorDocument; configId: number; background?: string | null; onCancel: () => void; onSaved: (plan: FloorDocument) => Promise<void> }) {
 const [plan, setPlan] = useState<FloorDocument>(()=>background&&!initial.backgroundSize?{...initial,backgroundSize:{x:0,y:0,width:1200,height:800}}:initial)
 const [camera, setCamera] = useState<Camera>({ x: 50, y: 50, zoom: 0.8 })
 const [selection, setSelection] = useState<Selection>(null)
 const [tool, setTool] = useState<'select' | 'pan' | 'wall' | 'zone'>('select')
 const [sourceRect, setSourceRect] = useState<PlanRect | null>(null)
 const [drawing, setDrawing] = useState<PlanRect | null>(null)
 const [undo, setUndo] = useState<FloorDocument[]>([])
 const [redo, setRedo] = useState<FloorDocument[]>([])
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [needsPin, setNeedsPin] = useState(false)
 const [pin, setPin] = useState('')
 const sidebar = useRef<HTMLElement>(null)
 const svg = useRef<SVGSVGElement>(null)
 const gesture = useRef<Gesture | null>(null)
 const pointers = useRef(new Map<number, {x: number; y: number}>())
 const pinch = useRef<{distance: number; center: {x: number; y: number}; camera: Camera} | null>(null)
 const backgroundSize = {x:0,y:0,...(plan.backgroundSize ?? {width:1200,height:800})}
 const current = selection?.kind === 'background' ? backgroundSize : selection ? plan[selection.kind].find((item) => keyOf(item) === selection.id) : null
 const currentTable = selection?.kind === 'tables' ? plan.tables.find(t=>t.key===selection.id) : undefined
 const currentZone = selection?.kind === 'zones' ? plan.zones.find(z => z.id === selection.id) : undefined
 const invalid = plan.tables.filter((table) => invalidTable(table, plan))
 const shownBackground = plan.background === undefined ? background : plan.background ? `data:${plan.background.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${plan.background}` : null
 const fits = planFits(plan)
 const valid = fits && plan.name.trim() !== '' && invalid.length === 0 && plan.zones.every((z) => z.name.trim())
 const world = (x: number, y: number) => { const r = svg.current!.getBoundingClientRect(); return { x: (x - r.left - camera.x) / camera.zoom, y: (y - r.top - camera.y) / camera.zoom } }
 function commit(next: FloorDocument) { if (busy) return; setUndo((h) => [...h.slice(-49), plan]); setRedo([]); setPlan(next); setError('') }
 function patch(values: Record<string, unknown>) {
  if (!selection) return
  if (selection.kind === 'background') { commit({...plan,backgroundSize:{...backgroundSize,...values}});return }
  commit({ ...plan, [selection.kind]: plan[selection.kind].map((item) => keyOf(item) === selection.id ? { ...item, ...values } : item) })
 }
 function fit() {
  const r = svg.current?.getBoundingClientRect(); if (!r) return
  const size = extent(plan); const zoom = Math.min(1.5, (r.width - 60) / size.width, (r.height - 60) / size.height)
  const fittedZoom=Math.max(0.02,zoom)
  setCamera({ x: 30-size.x*fittedZoom, y: 30-size.y*fittedZoom, zoom: fittedZoom })
 }
 useEffect(() => {
  const el = svg.current; if (!el) return
  const wheel = (e: WheelEvent) => {
   e.preventDefault()
   const r = el.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top
   setCamera((c) => { const zoom = Math.max(0.15, Math.min(2.5, c.zoom * Math.exp(-e.deltaY * 0.001))); return { x: x - (x - c.x) * zoom / c.zoom, y: y - (y - c.y) * zoom / c.zoom, zoom } })
  }
  el.addEventListener('wheel', wheel, {passive: false})
  return () => el.removeEventListener('wheel', wheel)
 }, [])
 function start(e: React.PointerEvent, chosen: Selection = null, resize = false) {
  if (busy || e.button > 0) return
  e.preventDefault(); e.stopPropagation(); svg.current?.setPointerCapture(e.pointerId)
  pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY})
  if (pointers.current.size === 2) {
   if (gesture.current) setPlan(gesture.current.before)
   gesture.current = null; setDrawing(null); setSourceRect(null)
   const [a,b] = [...pointers.current.values()]
   pinch.current = {distance: Math.hypot(a.x-b.x,a.y-b.y), center: {x:(a.x+b.x)/2,y:(a.y+b.y)/2}, camera}
   return
  }
  const point = world(e.clientX, e.clientY)
  if (chosen && tool === 'select') {
   const item = chosen.kind === 'background' ? backgroundSize : plan[chosen.kind].find((v) => keyOf(v) === chosen.id)
   if (!item) return
   setSelection(chosen); setSourceRect(item); if (sidebar.current) sidebar.current.scrollTop = 0
   gesture.current = {type: resize ? 'resize' : 'move', start: point, camera, original: item, selection: chosen, before: plan}
  } else if (tool === 'wall' || tool === 'zone') {
   gesture.current = {type:'draw',start:{x:snap(point.x),y:snap(point.y)},camera,before:plan}
   setDrawing({x:snap(point.x),y:snap(point.y),width:CELL,height:CELL})
  } else {
   setSelection(null)
   gesture.current = {type:'pan', start:{x:e.clientX,y:e.clientY},camera,before:plan}
  }
 }
 function move(e: React.PointerEvent) {
  if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
  if (pinch.current && pointers.current.size === 2) {
   const [a,b] = [...pointers.current.values()], p = pinch.current, r = svg.current!.getBoundingClientRect()
   const zoom = Math.max(0.15,Math.min(2.5,p.camera.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(p.distance,1)))
   setCamera({zoom,x:(a.x+b.x)/2-r.left-(p.center.x-r.left-p.camera.x)*zoom/p.camera.zoom,y:(a.y+b.y)/2-r.top-(p.center.y-r.top-p.camera.y)*zoom/p.camera.zoom}); return
  }
  const g = gesture.current; if (!g) return
  if (g.type === 'pan') { setCamera({...g.camera,x:g.camera.x+e.clientX-g.start.x,y:g.camera.y+e.clientY-g.start.y}); return }
  const point = world(e.clientX,e.clientY)
  if (g.type === 'draw') {
   const x=snap(point.x),y=snap(point.y)
   setDrawing({x:Math.min(x,g.start.x),y:Math.min(y,g.start.y),width:Math.max(CELL,Math.abs(x-g.start.x)),height:Math.max(CELL,Math.abs(y-g.start.y))}); return
  }
  if (!g.original || !g.selection) return
  const rect = g.type === 'resize'
   ? {...g.original,width:Math.max(CELL,snap(g.original.width+point.x-g.start.x)),height:Math.max(CELL,snap(g.original.height+point.y-g.start.y))}
   : {...g.original,x:snap(g.original.x+point.x-g.start.x),y:snap(g.original.y+point.y-g.start.y)}
  const chosen = g.selection
  if (chosen.kind === 'background') {
   if (g.type === 'resize') {const scale=Math.max(rect.width/g.original.width,rect.height/g.original.height);rect.width=g.original.width*scale;rect.height=g.original.height*scale}
   setPlan(p=>({...p,backgroundSize:rect}))
  } else {
   const kind = chosen.kind
   setPlan(p=>({...p,[kind]:p[kind].map(v=>keyOf(v)===chosen.id?{...v,...rect,...(kind==='tables'?{zone:zoneAt(rect,p.zones)}:{})}:v)}))
  }
 }
 function end(e: React.PointerEvent, cancelled = false) {
  pointers.current.delete(e.pointerId); setSourceRect(null)
  if (pinch.current) { if (pointers.current.size < 2) pinch.current=null; return }
  const g=gesture.current; gesture.current=null
  if (!g) return
  if (cancelled) { setPlan(g.before); setDrawing(null); return }
  if (g.type === 'draw' && drawing) {
   const id=uuid(), kind=tool==='wall'?'walls':'zones'
   if (kind === 'zones') {
    const zones = [...plan.zones, {...drawing,id,name:`Zona ${plan.zones.length+1}`,color:COLORS[plan.zones.length%COLORS.length]}]
    commit({...plan,zones,tables:plan.tables.map(t=>({...t,zone:t.zone||zoneAt(t,zones)}))})
   } else commit({...plan,walls:[...plan.walls,{...drawing,id}]})
   setSelection({kind,id}); setTool('select'); setDrawing(null)
  } else if (g.type === 'move' || g.type === 'resize') { setUndo((h)=>[...h.slice(-49),g.before]);setRedo([]) }
 }
 function addTable(width:number,height:number,seats:number) {
  const r=svg.current!.getBoundingClientRect(), center=world(r.left+r.width/2,r.top+r.height/2)
  const key=uuid(), rect={x:snap(center.x-width/2),y:snap(center.y-height/2),width,height}
  commit({...plan,tables:[...plan.tables,{...rect,key,id:null,number:Math.max(0,...plan.tables.map(t=>t.number))+1,seats,zone:zoneAt(rect,plan.zones)}]})
  setSelection({kind:'tables',id:key});setTool('select'); if (sidebar.current) sidebar.current.scrollTop = 0
 }
 function remove() {
  if (!selection) return
  if (selection.kind === 'background') {commit({...plan,background:null,backgroundSize:null});setSelection(null);return}
  const next={...plan,[selection.kind]:plan[selection.kind].filter((v)=>keyOf(v)!==selection.id)}
  if (selection.kind==='zones') next.tables=next.tables.map((t)=>t.zone===selection.id?{...t,zone:''}:t)
  commit(next);setSelection(null)
 }
 async function save() {
  if (!valid || busy) return
  setBusy(true);setError('')
  try {
   if (needsPin) {
    const auth = useAuthStore.getState()
    if (!auth.employee) throw new Error('Inicia sesión como administrador para guardar el plano.')
    const result = await checkPin(auth.employee.id, pin)
    setPin('')
    if (!result.ok) throw new Error(result.reason === 'locked' ? 'PIN bloqueado temporalmente. Inténtalo más tarde.' : 'El PIN no coincide. Revisa e intenta de nuevo.')
    await auth.startShift(result.employee, result.attendanceId, result.token)
    setNeedsPin(false)
   }
   const result=await savePlan(configId,normalizePlan(plan));await onSaved(result)
  }
  catch(e) {
   const message = e instanceof Error ? e.message : String(e)
   if (message.includes('Valida el PIN de un administrador')) {
    setNeedsPin(true)
    setError('Tu validación anterior venció. Confirma tu PIN aquí; los cambios del plano se conservan.')
   } else setError(message)
  }
  finally {setBusy(false)}
 }
 return <main className="h-screen flex flex-col bg-canvas text-ink" aria-label="Editor del restaurante">
  <header className="shrink-0 flex items-center gap-3 p-3 border-b border-border bg-surface">
   <div className="min-w-0 flex-1"><h1 className="font-semibold">Editar plano del restaurante</h1><p className="text-xs text-dim">Arrastra para mover · rueda o pellizco para zoom · los cambios se aplican al guardar</p></div>
   <button type="button" className="px-4 py-2 border border-border rounded-md" onClick={onCancel} disabled={busy}>Cancelar</button>
   <button type="button" className="px-4 py-2 bg-primary text-primary-ink rounded-md disabled:opacity-40" disabled={!valid||busy||(needsPin&&pin.length!==6)} onClick={()=>void save()}>{busy?'Guardando…':'Guardar'}</button>
  </header>
  {error && <p role="alert" className="px-4 py-2 bg-danger-soft text-danger-ink">{error}</p>}
  {needsPin && <form className="flex items-center gap-3 px-4 py-2 bg-surface" onSubmit={e=>{e.preventDefault();if(pin.length===6) void save()}}>
   <label className="text-sm">PIN del administrador<input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} className={inputClass} disabled={busy}/></label>
   <button type="submit" disabled={busy||pin.length!==6} className="px-4 py-2 rounded-md bg-primary text-primary-ink disabled:opacity-40">Validar y guardar</button>
  </form>}
  <div className="flex flex-1 min-h-0">
   <aside ref={sidebar} className="w-60 shrink-0 p-3 border-r border-border overflow-auto flex flex-col gap-3 bg-surface" aria-label="Herramientas del plano">
    <label className="text-sm">Nombre del piso<input className={inputClass} value={plan.name} onChange={e=>commit({...plan,name:e.target.value})}/></label>
    <div className="flex gap-2"><button disabled={!undo.length||busy} onClick={()=>{setRedo(h=>[...h,plan]);setPlan(undo[undo.length-1]);setUndo(h=>h.slice(0,-1))}} className="border border-border p-2 rounded disabled:opacity-40">Deshacer</button><button disabled={!redo.length||busy} onClick={()=>{setUndo(h=>[...h,plan]);setPlan(redo[redo.length-1]);setRedo(h=>h.slice(0,-1))}} className="border border-border p-2 rounded disabled:opacity-40">Rehacer</button></div>
    <section aria-label="Capas del plano" className="border border-border rounded-lg p-2">
     <h2 className="font-semibold text-sm">Capas</h2><p className="text-xs text-dim mb-2">Selecciona aquí un elemento tapado y arrástralo en el plano.</p>
     <div className="max-h-36 overflow-auto flex flex-col gap-1">
      {([...plan.tables.map(t=>({kind:'tables' as const,id:t.key,label:`Mesa ${t.number}`})),...plan.walls.map((w,i)=>({kind:'walls' as const,id:w.id,label:`Pared ${i+1}`})),...plan.zones.map(z=>({kind:'zones' as const,id:z.id,label:`Zona ${z.name}`})),...(shownBackground?[{kind:'background' as const,id:'background',label:'Imagen de referencia'}]:[])]).map(layer=><button key={`${layer.kind}:${layer.id}`} type="button" aria-label={`Seleccionar capa: ${layer.label}`} aria-pressed={selection?.kind===layer.kind&&selection.id===layer.id} disabled={busy} className={cn('text-sm text-left px-2 py-1 rounded',selection?.kind===layer.kind&&selection.id===layer.id?'bg-primary-soft text-primary':'hover:bg-muted')} onClick={()=>{setSelection({kind:layer.kind,id:layer.id});setTool('select')}}>{layer.label}</button>)}
     </div>
    </section>
    {current&&selection&&<section className="border-t border-border pt-3 flex flex-col gap-2" aria-label="Elemento seleccionado">
     <h2 className="font-semibold">{selection.kind==='tables'?'Mesa seleccionada':selection.kind==='walls'?'Pared seleccionada':selection.kind==='background'?'Imagen seleccionada':'Zona seleccionada'}</h2>
     {selection.kind==='tables'&&currentTable&&<><label className="text-sm">Número de mesa<input type="number" min={1} className={inputClass} value={currentTable.number} onChange={e=>patch({number:Number(e.target.value)})}/></label><label className="text-sm">Capacidad (personas)<input type="number" min={1} max={100} className={inputClass} value={currentTable.seats} onChange={e=>patch({seats:Number(e.target.value)})}/></label><label className="text-sm">Zona de la mesa<select className={inputClass} value={currentTable.zone} onChange={e=>patch({zone:e.target.value})}><option value="">Sin zona</option>{plan.zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label></>}
     {selection.kind==='zones'&&currentZone&&<><label className="text-sm">Nombre de zona<input className={inputClass} value={currentZone.name} onChange={e=>patch({name:e.target.value})}/></label><label className="text-sm">Color de zona<input type="color" value={currentZone.color} onChange={e=>patch({color:e.target.value})}/></label></>}
     <details><summary className="cursor-pointer text-sm text-dim">Configuración avanzada</summary><div className="grid grid-cols-2 gap-2 mt-2">{(['width','height'] as const).map(k=><label key={k} className="text-xs">{k==='width'?'Ancho (celdas)':'Largo (celdas)'}<input className={inputClass} type="number" min={1} max={1000} value={current[k]/CELL} onChange={e=>patch({[k]:Math.max(CELL,Math.min(20000,Number(e.target.value)*CELL))})}/></label>)}</div></details>
     {selection.kind!=='background'&&<button className="border border-border p-2 rounded" onClick={()=>patch({width:current.height,height:current.width})}>Rotar</button>}
     <p className="text-xs text-dim">Arrastra la esquina blanca para cambiar el tamaño.</p>
     <button className="bg-danger-soft text-danger-ink p-2 rounded" onClick={remove}>Eliminar elemento</button>
    </section>}
    <div className="flex flex-col gap-1">{([['select','Seleccionar elementos'],['pan','Desplazar plano'],['wall','Dibujar pared'],['zone','Dibujar zona']] as const).map(([key,label])=><button key={key} aria-pressed={tool===key} className={cn('p-2 text-left rounded border border-border',tool===key&&'bg-primary-soft text-primary')} onClick={()=>setTool(key)}>{label}</button>)}</div>
    <p className="text-xs text-dim">Dibuja paredes separadas para dejar puertas y pasillos. Las zonas se dibujan como áreas rectangulares.</p>
    <label className="text-sm">Imagen de referencia<span className="block border border-border rounded p-2 text-xs mt-1 cursor-pointer">Subir PNG o JPG · hasta 10 MB</span><input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={e=>{
     const file=e.target.files?.[0];if(!file)return
     if(!['image/png','image/jpeg'].includes(file.type)||file.size>10*1024*1024){setError('Usa una imagen PNG o JPG de hasta 10 MB.');return}
     const reader=new FileReader();reader.onload=()=>commit({...plan,background:String(reader.result).split(',')[1],backgroundSize:{width:1200,height:800}});reader.readAsDataURL(file)
    }}/></label>
    {shownBackground&&<label className="text-sm">Tamaño de la imagen<input aria-label="Tamaño de la imagen" className="w-full" type="range" min={25} max={400} step={5} value={Math.round(backgroundSize.width/12)} onChange={e=>{const scale=Number(e.target.value)/100;commit({...plan,backgroundSize:{...backgroundSize,width:1200*scale,height:800*scale}})}}/><span className="text-xs text-dim">{Math.round(backgroundSize.width/12)}% · conserva las proporciones</span></label>}
    {shownBackground&&<button className="text-sm text-left text-dim" onClick={()=>{commit({...plan,background:null,backgroundSize:null});if(selection?.kind==='background')setSelection(null)}}>Quitar imagen de referencia</button>}
    <p className="font-semibold text-sm">Agregar mesa</p>
    {[[120,120,4,'Mesa pequeña'],[240,120,8,'Mesa grande horizontal'],[120,240,8,'Mesa grande vertical'],[160,160,6,'Mesa personalizada']].map(([w,h,n,label])=><button key={label} className="text-left p-2 border border-border rounded" onClick={()=>addTable(Number(w),Number(h),Number(n))}>{label}</button>)}
    {!fits&&<p role="status" className="text-sm text-danger-ink">El conjunto del plano es demasiado grande o tiene dimensiones inválidas. Acerca sus elementos o reduce su tamaño.</p>}
    {invalid.length>0&&<p role="status" className="text-sm text-danger-ink bg-danger-soft p-2 rounded">Hay {invalid.length} mesas en rojo. Puedes girarlas o moverlas; sepáralas y revisa sus datos antes de guardar.</p>}

   </aside>
   <div className="relative flex-1 min-w-0">
    <svg ref={svg} aria-label="Cuadrícula del restaurante" className="w-full h-full touch-none select-none" onPointerDown={e=>start(e)} onPointerMove={move} onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)}>
     <defs><pattern id="floor-editor-grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse" patternTransform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}><path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke="#93c5fd" strokeOpacity={0.55} strokeWidth="1"/></pattern></defs>
     <rect width="100%" height="100%" fill="#eff6ff" pointerEvents="none"/>
     <rect width="100%" height="100%" fill="url(#floor-editor-grid)" pointerEvents="none"/>
     <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
      {shownBackground&&<image x={backgroundSize.x} y={backgroundSize.y} href={shownBackground} width={backgroundSize.width} height={backgroundSize.height} preserveAspectRatio="xMinYMin meet" opacity={0.3} pointerEvents="none"/>}
      {plan.zones.map(z=><g key={z.id} onPointerDown={e=>start(e,{kind:'zones',id:z.id})} role="button" aria-label={`Zona ${z.name}`}><rect {...{x:z.x,y:z.y,width:z.width,height:z.height}} fill={z.color} fillOpacity={0.12} stroke={z.color} strokeWidth={2} strokeDasharray="8 4"/><text x={z.x+12} y={z.y+25} fill={z.color} fontSize={18} fontWeight="600">{z.name}</text></g>)}
      {plan.walls.map(w=><rect key={w.id} {...{x:w.x,y:w.y,width:w.width,height:w.height}} fill="#475569" stroke="#1e293b" strokeWidth={2} role="button" aria-label="Pared" onPointerDown={e=>start(e,{kind:'walls',id:w.id})}/>)}
      {sourceRect&&<rect {...{x:sourceRect.x,y:sourceRect.y,width:sourceRect.width,height:sourceRect.height}} fill="#94a3b8" fillOpacity={0.2} stroke="#64748b" strokeDasharray="6 4" pointerEvents="none"/>}
      {plan.tables.map(t=>{const bad=invalidTable(t,plan),selected=selection?.kind==='tables'&&selection.id===t.key;return <foreignObject key={t.key} x={t.x-24} y={t.y-24} width={t.width+48} height={t.height+48} overflow="visible" pointerEvents="none" data-plan-table={t.key}>
       <TableShape rect={{x:24,y:24,width:t.width,height:t.height}} name={String(t.number)} state="available" selected={selected}
        label={`Mesa ${t.number}, ${t.seats} personas${bad?', ubicación no válida':''}`} pill={{text:`${t.seats} personas`,icon:'user'}}
        onPointerDown={e=>start(e,{kind:'tables',id:t.key})} className={cn('pointer-events-auto',bad&&'[&>button]:bg-danger [&>button]:ring-2 [&>button]:ring-danger-ink')}/>
      </foreignObject>})}
      {drawing&&<rect {...drawing} fill={tool==='wall'?'#475569':'#3b82f6'} opacity={0.4} stroke="#2563eb" strokeWidth={2} pointerEvents="none"/>}
      {current&&selection&&tool==='select'&&<rect x={current.x} y={current.y} width={current.width} height={current.height} fill="transparent" stroke="#2563eb" strokeWidth={2} strokeDasharray="8 4" role="button" aria-label="Mover elemento seleccionado" pointerEvents={selection.kind==='tables'?'none':'all'} className="cursor-move" onPointerDown={e=>start(e,selection)}/>}
      {current&&selection&&tool==='select'&&<rect x={current.x+current.width-10} y={current.y+current.height-10} width={20} height={20} fill="white" stroke="#0f172a" strokeWidth={3} role="button" aria-label="Cambiar tamaño" className="cursor-nwse-resize" onPointerDown={e=>start(e,selection,true)}/>}
     </g>
    </svg>
    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-surface border border-border shadow rounded-lg p-2"><button aria-label="Alejar" onClick={()=>setCamera(c=>({...c,zoom:Math.max(0.15,c.zoom/1.2)}))} className="px-3 py-1">−</button><span className="text-sm">{Math.round(camera.zoom*100)}%</span><button aria-label="Acercar" onClick={()=>setCamera(c=>({...c,zoom:Math.min(2.5,c.zoom*1.2)}))} className="px-3 py-1">+</button><button className="px-3 py-1 border-l border-border" onClick={fit}>Ver todo</button></div>
   </div>
  </div>
 </main>
}
