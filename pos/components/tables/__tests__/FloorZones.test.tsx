import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { FloorZones } from '@/components/tables/FloorZones'
import { assignZones, readAssignments } from '@/lib/services/floorPlan'
import { listPosEmployees } from '@/lib/services/employees'
import { useAuthStore } from '@/lib/stores/authStore'
import type { FloorDocument } from '@/lib/domain/floorPlan'
jest.mock('@/lib/services/floorPlan',()=>({assignZones:jest.fn(),readAssignments:jest.fn()}))
jest.mock('@/lib/services/employees',()=>({listPosEmployees:jest.fn()}))
jest.mock('@/lib/stores/authStore',()=>({useAuthStore:jest.fn()}))
jest.mock('@/lib/hooks/useIdentity',()=>({useIdentity:()=>({role:'admin'})}))
jest.mock('@/lib/stores/orderStore',()=>({useOrderStore:(select:(s:{calls:unknown[]})=>unknown)=>select({calls:[]})}))
const plan:FloorDocument={id:2,name:'Terraza',revision:1,walls:[],zones:[{id:'z',name:'Ventana',color:'#3b82f6',x:0,y:0,width:800,height:600}],tables:[{id:3,key:'3',number:3,seats:4,zone:'z',x:100,y:100,width:120,height:120}]}
it('assigns multiple employees in this session and filters their tables without blocking other tables',async()=>{
 const auth={session:{id:29,configId:1},employee:{id:4}}
 ;(useAuthStore as unknown as jest.Mock).mockImplementation(select=>select(auth))
 ;(readAssignments as jest.Mock).mockResolvedValue({})
 ;(listPosEmployees as jest.Mock).mockResolvedValue([{id:4,name:'Sofía'},{id:5,name:'Laura'}])
 ;(assignZones as jest.Mock).mockResolvedValue({})
 const filter=jest.fn()
 render(<FloorZones plan={plan} onFilter={filter}/> )
 fireEvent.click(screen.getByText('Asignar meseros por zona'))
 fireEvent.click(await screen.findByRole('checkbox',{name:'Sofía'}))
 fireEvent.click(screen.getByRole('checkbox',{name:'Laura'}))
 fireEvent.click(screen.getByText('Guardar asignación'))
 await waitFor(()=>expect(assignZones).toHaveBeenCalledWith(29,2,{z:[4,5]}))
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'mine'}})
 await waitFor(()=>expect(filter).toHaveBeenLastCalledWith([3]))
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'all'}})
 await waitFor(()=>expect(filter).toHaveBeenLastCalledWith(null))
})
