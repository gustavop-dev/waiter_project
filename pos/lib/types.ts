export interface Product { id: number; templateId: number; name: string; price: number; categoryIds: number[]; taxIds: number[]; favorite: boolean; storable: boolean; soldOut: boolean; hasImage: boolean }
export interface Category { id: number; name: string; sequence: number; station: string | null }
export interface Floor { id: number; name: string; tableIds: number[] }
export interface Table { id: number; number: number; floorId: number; seats: number }
export interface PaymentMethod { id: number; name: string; type: 'cash' | 'bank' | 'pay_later' }
export interface Company { name: string }
// Umbrales y supuestos que viven en pos.config (addon projectapp_ops) para que todas las tablets vean lo mismo.
export interface Settings { configId: number; configName: string; alertLateMinutes: number; alertBillMinutes: number; roiHourCost: number; roiMinutesPerOrder: number; roiBaselineHoursPer100: number; roiMonthlyCost: number; roiStartDate: string | null; tipProductId: number | null }
export interface Catalog { company: Company; settings: Settings; products: Product[]; categories: Category[]; floors: Floor[]; tables: Table[]; paymentMethods: PaymentMethod[] }
