export interface Product { id: number; templateId: number; name: string; price: number; categoryIds: number[]; taxIds: number[]; favorite: boolean; storable: boolean; soldOut: boolean }
export interface Category { id: number; name: string; sequence: number }
export interface Floor { id: number; name: string; tableIds: number[] }
export interface Table { id: number; number: number; floorId: number; seats: number }
export interface PaymentMethod { id: number; name: string; type: 'cash' | 'bank' | 'pay_later' }
export interface Company { name: string }
export interface Catalog { company: Company; products: Product[]; categories: Category[]; floors: Floor[]; tables: Table[]; paymentMethods: PaymentMethod[] }
