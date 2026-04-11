'use server'

import { getReservations } from '@/lib/queries/reservations'

export async function fetchScheduleReservations(restaurantId: string, date: string) {
    return getReservations(restaurantId, { date })
}
