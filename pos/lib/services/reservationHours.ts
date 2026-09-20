import type { Schedule } from '@/lib/domain/reservationHours'
import { callKw } from '@/lib/services/odoo'

// El servidor siempre devuelve el horario completo: sin configurar, el anterior (10:00–22:00) repetido los siete días.
export const getSchedule = (configId: number): Promise<Schedule> => callKw<Schedule>('pos.config', 'waiter_reservation_schedule', [[configId]])
export const saveSchedule = (configId: number, schedule: Schedule): Promise<Schedule> =>
  callKw<Schedule>('pos.config', 'waiter_save_reservation_schedule', [[configId], schedule])
