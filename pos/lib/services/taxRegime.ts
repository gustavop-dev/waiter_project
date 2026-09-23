import { callKw } from '@/lib/services/odoo'
import { useAuthStore } from '@/lib/stores/authStore'

// 'mixed' no se elige: es lo que responde Odoo cuando la carta lleva impuestos distintos entre sí.
export type TaxRegime = 'inc' | 'iva' | 'none'
export interface TaxRegimeInfo { regime: TaxRegime | 'mixed'; products: number; taxes: number[] }

export async function taxRegime(configId: number, regime?: TaxRegime): Promise<TaxRegimeInfo> {
  const employee = useAuthStore.getState().employee
  return callKw<TaxRegimeInfo>('pos.config', 'waiter_tax_regime', [[configId], employee?.id, employee?.token, regime ?? null])
}
