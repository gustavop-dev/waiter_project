import type { FloorDocument } from '@/lib/domain/floorPlan'
import { callKw } from '@/lib/services/odoo'
import { useAuthStore } from '@/lib/stores/authStore'
export const readPlan = (id: number) => callKw<FloorDocument>('restaurant.floor', 'waiter_read_plan', [[id]])
export function savePlan(configId: number, plan: FloorDocument) {
 const e = useAuthStore.getState().employee
 return callKw<FloorDocument>('restaurant.floor', 'waiter_save_plan', [configId, plan.id, plan, e?.id, e?.token])
}
export type Assignments = Record<string, number[]>
export async function readAssignments(sessionId: number, floorId: number): Promise<Assignments> {
 const [row] = await callKw<{waiter_zone_assignments: Record<string, Assignments> | false}[]>('pos.session', 'read', [[sessionId], ['waiter_zone_assignments']])
 return row.waiter_zone_assignments && row.waiter_zone_assignments[String(floorId)] || {}
}
export function assignZones(sessionId: number, floorId: number, assignments: Assignments) {
 const e = useAuthStore.getState().employee
 return callKw('pos.session', 'waiter_assign_zones', [[sessionId], floorId, assignments, e?.id, e?.token])
}

export const zoneNoticeTargets = (orderIds: number[]) => callKw<Record<string, number[]>>('pos.order', 'waiter_zone_targets', [orderIds])
