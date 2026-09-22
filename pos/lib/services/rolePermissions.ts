import type { RolePolicy } from '@/lib/domain/permissions'
import { callKw } from '@/lib/services/odoo'
import { useAuthStore } from '@/lib/stores/authStore'

export async function rolePolicy(configId: number, policy?: RolePolicy): Promise<RolePolicy> {
  const employee = useAuthStore.getState().employee
  return callKw<RolePolicy>('pos.config', 'waiter_role_policy', [[configId], employee?.id, employee?.token, policy ?? null])
}
