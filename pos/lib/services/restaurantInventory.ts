import { callKw } from '@/lib/services/odoo'
import { useAuthStore } from '@/lib/stores/authStore'
export interface RecipeEntry {ingredientId:number;qty:number;uomId:number}
export interface RecipeDetail {id:number;name:string;bom_id:number|null;yield:number;lines:RecipeEntry[];servings:number;cost:number;limiting:string[];ingredients:{id:number;name:string;qty:number;uom_id:number;uom:string;stock:number;pending:number;free:number;servings:number;cost:number}[]}
export interface InventoryDetail {stock:number;pending:number;cost:number;min:number;max:number;uom:string;history:{id:number;date:string;qty:number;reason:string;kind:string;employee:string}[]}
const identity=()=>{const e=useAuthStore.getState().employee;return [e?.id,e?.token]}
export const getRecipe=(id:number)=>callKw<RecipeDetail>('product.template','waiter_recipe_detail',[[id]])
export const updateRecipe=(id:number,lines:RecipeEntry[],yieldQty:number,bomId:number|null)=>callKw<RecipeDetail>('product.template','waiter_update_recipe',[[id],lines,yieldQty,bomId,...identity()])
export const getInventory=(id:number)=>callKw<InventoryDetail>('product.template','waiter_inventory_detail',[[id]])
export const moveInventory=(id:number,kind:string,qty:number,reason:string,key:string,expected:number)=>callKw<InventoryDetail>('product.template','waiter_inventory_move',[[id],kind,qty,reason,key,expected,...identity()])
export const inventorySettings=(id:number,cost:number,min:number,max:number)=>callKw<InventoryDetail>('product.template','waiter_inventory_settings',[[id],cost,min,max,...identity()])
