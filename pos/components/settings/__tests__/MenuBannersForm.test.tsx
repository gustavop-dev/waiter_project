import {render,screen,fireEvent,waitFor} from '@testing-library/react'
import {MenuBannersForm} from '../MenuBannersForm'
import {callKw} from '@/lib/services/odoo'
jest.mock('@/lib/services/odoo',()=>({callKw:jest.fn()}))
jest.mock('@/lib/stores/authStore',()=>({useAuthStore:{getState:()=>({employee:{id:9,token:'session'}})}}))
jest.mock('@/lib/services/catalogAdmin',()=>({listProducts:async()=>[{id:20,variantId:30,name:'Combo almuerzo',available:true,dinerAttributes:{combo:[{}]}}],listCategories:async()=>[{id:2,name:'Combos'}]}))
it('shows image dimensions and saves a catalog combo destination with employee identity',async()=>{
 jest.mocked(callKw).mockResolvedValue({banners:[]})
 render(<MenuBannersForm configId={1}/>);fireEvent.click(await screen.findByRole('button',{name:'Añadir banner'}))
 expect(screen.getByText('1200 × 600 px (2:1)')).toBeInTheDocument()
 fireEvent.change(screen.getByLabelText('Destino del catálogo'),{target:{value:'30'}})
 fireEvent.click(screen.getByRole('button',{name:'Guardar banners'}))
 await waitFor(()=>expect(callKw).toHaveBeenCalledWith('pos.config','waiter_banner_settings',[[1],9,'session',[expect.objectContaining({target:'product',targetId:30})]]))
})
