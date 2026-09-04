export interface Product { id: number; templateId: number; name: string; price: number; categoryIds: number[]; taxIds: number[] }
export interface Category { id: number; name: string; sequence: number }
export interface Floor { id: number; name: string; tableIds: number[] }
export interface Table { id: number; number: number; floorId: number; seats: number }
export interface PaymentMethod { id: number; name: string; type: 'cash' | 'bank' | 'pay_later' }
export interface Catalog { products: Product[]; categories: Category[]; floors: Floor[]; tables: Table[]; paymentMethods: PaymentMethod[] }
