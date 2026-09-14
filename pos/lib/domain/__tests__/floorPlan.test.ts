import { extent, invalidTable, normalizePlan, planFits, snap, zoneAt, type FloorDocument } from '@/lib/domain/floorPlan'
const plan: FloorDocument = {id:null,name:'Salón',revision:0,walls:[],zones:[{id:'z',name:'Terraza',color:'#3b82f6',x:0,y:0,width:600,height:400}],tables:[{id:1,key:'1',number:1,seats:6,zone:'z',x:40,y:40,width:120,height:240},{id:2,key:'2',number:2,seats:4,zone:'z',x:200,y:40,width:120,height:120}]}
it('allows a temporary rotation and identifies the collision until moved away',()=>{
 const rotated={...plan.tables[0],width:240,height:120}
 expect(invalidTable(rotated,plan)).toBe(true)
 expect(invalidTable({...rotated,y:240},plan)).toBe(false)
})
it('rejects walls, duplicate numbers and invalid capacity',()=>{
 expect(invalidTable(plan.tables[0],plan)).toBe(false)
 expect(invalidTable({...plan.tables[0],number:2},plan)).toBe(true)
 expect(invalidTable({...plan.tables[0],seats:0},plan)).toBe(true)
 expect(invalidTable(plan.tables[0],{...plan,walls:[{id:'wall',x:0,y:0,width:800,height:40}]})).toBe(true)
})
it('assigns a table by its center and leaves outside tables unassigned',()=>{
 expect(zoneAt(plan.tables[0],plan.zones)).toBe('z')
 expect(zoneAt({...plan.tables[0],x:800},plan.zones)).toBe('')
})

it('allows negative coordinates and translates all layers together for persistence',()=>{
 const draft={...plan,backgroundSize:{x:0,y:0,width:1200,height:800},walls:[{id:'w',x:-400,y:-200,width:20,height:100}],tables:[{...plan.tables[0],x:-200,y:-100}]}
 expect(snap(-83)).toBe(-80)
 expect(invalidTable(draft.tables[0],draft)).toBe(false)
 expect(planFits(draft)).toBe(true)
 const saved=normalizePlan(draft)
 expect(saved.tables[0]).toMatchObject({x:200,y:100,zone:'z'})
 expect(saved.walls[0]).toMatchObject({x:0,y:0})
 expect(saved.zones[0]).toMatchObject({x:400,y:200})
 expect(saved.backgroundSize).toMatchObject({x:400,y:200})
 expect(normalizePlan(saved)).toBe(saved)
 expect(draft.tables[0].x).toBe(-200)
 expect(extent(draft)).toMatchObject({x:-400,y:-200})
 expect(planFits({...draft,tables:[{...draft.tables[0],x:-22000}]})).toBe(false)
})
