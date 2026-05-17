'use server'

import { getReservations } from '@/lib/queries/reservations'
import { requirePermission } from '@/lib/auth/server'

export async function fetchScheduleReservations(restaurantId: string, date: string) {
    await requirePermission('reservations', 'reservations.read')
    return getReservations(restaurantId, { date })
}
