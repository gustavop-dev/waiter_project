import type { FloorDocument } from '@/lib/domain/floorPlan'
import type { Assignments, StaffSource, ZoneStaff } from '@/lib/domain/zoneStaff'
import { callKw } from '@/lib/services/odoo'
import { useAuthStore } from '@/lib/stores/authStore'
export const readPlan = (id: number) => callKw<FloorDocument>('restaurant.floor', 'waiter_read_plan', [[id]])
export function savePlan(configId: number, plan: FloorDocument) {
 const e = useAuthStore.getState().employee
 return callKw<FloorDocument>('restaurant.floor', 'waiter_save_plan', [configId, plan.id, plan, e?.id, e?.token])
}
// Elimina un piso del terminal (PIN de administrador y caja cerrada, como guardar el plano). `removed`: se borró con sus
// mesas. `archived`: tenía ventas en el historial, así que se archivó y se desvinculó; para el restaurante desaparece igual.
export function deleteFloor(configId: number, floorId: number) {
 const e = useAuthStore.getState().employee
 return callKw<{id:number;result:'removed'|'archived'}>('restaurant.floor', 'waiter_delete_floor', [configId, floorId, e?.id, e?.token])
}
export type { Assignments } from '@/lib/domain/zoneStaff'
// Quién atiende cada zona ahora: el ajuste del turno si lo hay, o el reparto habitual del piso (`source` lo dice).
// Sin turno abierto (`sessionId` nulo) devuelve siempre el habitual.
export async function readZoneStaff(floorId: number, sessionId?: number | null): Promise<ZoneStaff> {
 const raw = await callKw<{assignments: Assignments | false; source: StaffSource; plan: Assignments | false}>('restaurant.floor', 'waiter_zone_staff_for', [[floorId], sessionId ?? false])
 return { assignments: raw.assignments || {}, source: raw.source, plan: raw.plan || {} }
}
// Reparto habitual del piso: no necesita caja abierta.
export function assignZoneStaff(configId: number, floorId: number, assignments: Assignments) {
 const e = useAuthStore.getState().employee
 return callKw('restaurant.floor', 'waiter_assign_zone_staff', [configId, floorId, assignments, e?.id, e?.token])
}
// Ajuste solo de este turno; `null` lo borra y el turno vuelve al reparto habitual.
export function assignZones(sessionId: number, floorId: number, assignments: Assignments | null) {
 const e = useAuthStore.getState().employee
 return callKw('pos.session', 'waiter_assign_zones', [[sessionId], floorId, assignments, e?.id, e?.token])
}

export const zoneNoticeTargets = (orderIds: number[]) => callKw<Record<string, number[]>>('pos.order', 'waiter_zone_targets', [orderIds])
