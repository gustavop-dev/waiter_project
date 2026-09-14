'use client'
import { useRef, useState, type ReactNode } from 'react'
export function PlanViewport({children,width,height}: {children:ReactNode;width:number;height:number}) {
 const root=useRef<HTMLDivElement>(null)
 const pan=useRef<{x:number;y:number;left:number;top:number}|null>(null)
 const [zoom,setZoom]=useState(1)
 return <div className="relative flex-1 min-h-0 min-w-0">
  <div ref={root} data-testid="floor-plan" className="absolute inset-0 overflow-auto touch-pan-x touch-pan-y" onPointerDown={e=>{
   if ((e.target as HTMLElement).closest('button')||e.pointerType==='touch') return
   pan.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};e.currentTarget.setPointerCapture(e.pointerId)
  }} onPointerMove={e=>{if(pan.current){e.currentTarget.scrollLeft=pan.current.left-(e.clientX-pan.current.x);e.currentTarget.scrollTop=pan.current.top-(e.clientY-pan.current.y)}}} onPointerUp={()=>{pan.current=null}} onPointerCancel={()=>{pan.current=null}}>
   <div style={{width:width*zoom,height:height*zoom,minWidth:'100%',minHeight:'100%'}}><div className="relative origin-top-left" style={{width,height,transform:`scale(${zoom})`}}>{children}</div></div>
  </div>
  <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg border border-border bg-surface p-2 shadow text-sm"><button aria-label="Alejar plano" className="px-2" onClick={()=>setZoom(z=>Math.max(0.2,z/1.2))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="Acercar plano" className="px-2" onClick={()=>setZoom(z=>Math.min(2,z*1.2))}>+</button><button onClick={()=>{const r=root.current;if(r){setZoom(Math.max(0.2,Math.min(r.clientWidth/width,r.clientHeight/height,1)));r.scrollTo(0,0)}}}>Ver todo</button></div>
 </div>
}
