'use server'

import { getReservationById } from '@/lib/queries/reservations'

export async function getBookingDetails(id: string) {
    try {
        const booking = await getReservationById(id)
        return { success: true, data: booking }
    } catch (error) {
        console.error('Failed to fetch booking:', error)
        return { success: false, error: 'Failed to fetch booking details' }
    }
}
