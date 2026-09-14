'use client'
import { useEffect, useState } from 'react'
import type { FloorDocument } from '@/lib/domain/floorPlan'
import { assignZones, readAssignments, type Assignments } from '@/lib/services/floorPlan'
import { listPosEmployees, type PosEmployee } from '@/lib/services/employees'
import { useAuthStore } from '@/lib/stores/authStore'
import { useIdentity } from '@/lib/hooks/useIdentity'
import { useOrderStore } from '@/lib/stores/orderStore'

export function FloorZones({plan,onFilter}: {plan:FloorDocument;onFilter:(ids:number[]|null)=>void}) {
 const session=useAuthStore(s=>s.session), employee=useAuthStore(s=>s.employee)
 const {role}=useIdentity()
 const calls=useOrderStore(s=>s.calls)
 const [assignments,setAssignments]=useState<Assignments>({}),[draft,setDraft]=useState<Assignments>({})
 const [employees,setEmployees]=useState<PosEmployee[]>([]),[editing,setEditing]=useState(false),[filter,setFilter]=useState('all'),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{
  if(!session||!plan.id)return
  let alive=true
  const load=()=>readAssignments(session.id,plan.id!).then(a=>{if(alive)setAssignments(a)}).catch(()=>{if(alive)setError('No se pudieron cargar las asignaciones del turno.')})
  void load();const timer=setInterval(()=>void load(),10000)
  return()=>{alive=false;clearInterval(timer)}
 },[session,plan.id])
 useEffect(()=>{
  if(filter==='all'){onFilter(null);return}
  const zones=filter==='mine'?plan.zones.filter(z=>(assignments[z.id]??[]).includes(employee?.id??0)).map(z=>z.id):[filter]
  onFilter(plan.tables.filter(t=>zones.includes(t.zone)).flatMap(t=>t.id===null?[]:[t.id]))
 },[filter,assignments,employee?.id,plan,onFilter])
 if(!plan.zones.length)return null
 async function openAssignments(){
  if(!session)return
  try{setEmployees(await listPosEmployees(session.configId));setDraft(assignments);setEditing(true);setError('')}catch{setError('No se pudo cargar la lista de meseros.')}
 }
 async function save(){
  if(!session||!plan.id)return
  setBusy(true)
  try{await assignZones(session.id,plan.id,draft);setAssignments(draft);setEditing(false);setError('')}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 const zoneCalls=plan.tables.filter(t=>calls.some(c=>c.tableId===t.id)&&(filter==='all'||(filter==='mine'?(assignments[t.zone]??[]).includes(employee?.id??0):t.zone===filter))).length
 return <section className="shrink-0 border-b border-border bg-surface px-4 py-2 text-sm" aria-label="Zonas del restaurante">
  <div className="flex items-center gap-3"><label>Ver zona <select className="ml-2 border border-border rounded p-2 bg-surface" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas las zonas</option>{session&&<option value="mine">Mis zonas</option>}{plan.zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
   <span className="text-dim">{zoneCalls} mesas con avisos en esta vista</span>
   {role==='admin'&&session&&<button className="ml-auto border border-border p-2 rounded" onClick={()=>void openAssignments()}>Asignar meseros por zona</button>}
  </div>
  {error&&<p role="alert" className="text-danger-ink py-2">{error}</p>}
  {editing&&<div className="py-3"><p className="text-dim mb-2">Asignación de este turno. Una zona puede tener varios meseros; todos pueden ayudar en otras zonas.</p><div className="flex gap-3 overflow-auto max-h-52">{plan.zones.map(z=><fieldset key={z.id} className="min-w-48 border border-border rounded p-2"><legend style={{color:z.color}}>{z.name}</legend>{employees.map(e=><label key={e.id} className="flex items-center gap-2 py-1"><input type="checkbox" checked={(draft[z.id]??[]).includes(e.id)} onChange={ev=>setDraft(a=>({...a,[z.id]:ev.target.checked?[...(a[z.id]??[]),e.id]:(a[z.id]??[]).filter(id=>id!==e.id)}))}/>{e.name}</label>)}</fieldset>)}</div><div className="flex gap-2 mt-3"><button onClick={()=>setEditing(false)} disabled={busy} className="border border-border p-2 rounded">Cancelar asignación</button><button onClick={()=>void save()} disabled={busy} className="bg-primary text-primary-ink p-2 rounded">Guardar asignación</button></div></div>}
 </section>
}
