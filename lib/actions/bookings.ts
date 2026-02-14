'use server'

import { createClient } from '@/lib/supabase/server'
import { getReservationById } from '@/lib/queries/reservations'
import { getUsers } from '@/lib/queries/users'
import { revalidatePath } from 'next/cache'
import { getVenues } from '@/lib/queries/venues'

export async function getStaffList() {
    try {
        const users = await getUsers()
        return { success: true, data: users }
    } catch (error) {
        console.error('Failed to fetch staff:', error)
        return { success: false, data: [] }
    }
}

export async function getBookingDetails(id: string) {
    try {
        const booking = await getReservationById(id)
        return { success: true, data: booking }
    } catch (error) {
        console.error('Failed to fetch booking:', error)
        return { success: false, error: 'Failed to fetch booking details' }
    }
}

export async function updateBooking(
    id: string,
    data: {
        status?: string
        notes?: string
        date?: string
        start_time?: string
        end_time?: string
        venue_id?: string
        group_name?: string
        party_size?: number
        rep_name?: string
        arranger_name?: string
        conductor_count?: number
        crew_count?: number
        agency_name?: string
        agency_branch?: string
        agency_tel?: string
        agency_fax?: string
        agency_address?: string
    },
    staffAssignments?: {
        prep: string[]
        service: string[]
        cleaning: string[]
    }
) {
    try {
        const supabase = await createClient()

        // Build the update payload, only including defined fields
        const updatePayload: Record<string, any> = {}
        if (data.status !== undefined) {
            updatePayload.status = data.status
            if (data.status === 'confirmed') {
                updatePayload.confirmed_at = new Date().toISOString()
            }
        }
        if (data.notes !== undefined) updatePayload.notes = data.notes
        if (data.date !== undefined) updatePayload.date = data.date
        if (data.start_time !== undefined) updatePayload.start_time = data.start_time || null
        if (data.end_time !== undefined) updatePayload.end_time = data.end_time || null
        if (data.venue_id !== undefined) updatePayload.venue_id = data.venue_id || null
        if (data.group_name !== undefined) updatePayload.group_name = data.group_name
        if (data.party_size !== undefined) updatePayload.party_size = data.party_size
        if (data.rep_name !== undefined) updatePayload.rep_name = data.rep_name
        if (data.arranger_name !== undefined) updatePayload.arranger_name = data.arranger_name
        if (data.conductor_count !== undefined) updatePayload.conductor_count = data.conductor_count
        if (data.crew_count !== undefined) updatePayload.crew_count = data.crew_count
        if (data.agency_name !== undefined) updatePayload.agency_name = data.agency_name
        if (data.agency_branch !== undefined) updatePayload.agency_branch = data.agency_branch
        if (data.agency_tel !== undefined) updatePayload.agency_tel = data.agency_tel
        if (data.agency_fax !== undefined) updatePayload.agency_fax = data.agency_fax
        if (data.agency_address !== undefined) updatePayload.agency_address = data.agency_address

        // Update the reservation
        const { error: updateError } = await supabase
            .from('reservations')
            .update(updatePayload)
            .eq('id', id)

        if (updateError) {
            console.error('Error updating reservation:', updateError)
            return { success: false, error: updateError.message }
        }

        // Update staff assignments if provided
        if (staffAssignments) {
            // Delete existing assignments
            const { error: deleteError } = await supabase
                .from('reservation_staff')
                .delete()
                .eq('reservation_id', id)

            if (deleteError) {
                console.error('Error deleting staff assignments:', deleteError)
                return { success: false, error: deleteError.message }
            }

            // Insert new assignments
            const staffRows = [
                ...staffAssignments.prep.map(userId => ({
                    reservation_id: id,
                    user_id: userId,
                    role: 'prep',
                })),
                ...staffAssignments.service.map(userId => ({
                    reservation_id: id,
                    user_id: userId,
                    role: 'service',
                })),
                ...staffAssignments.cleaning.map(userId => ({
                    reservation_id: id,
                    user_id: userId,
                    role: 'cleaning',
                })),
            ]

            if (staffRows.length > 0) {
                const { error: insertError } = await supabase
                    .from('reservation_staff')
                    .insert(staffRows)

                if (insertError) {
                    console.error('Error inserting staff assignments:', insertError)
                    return { success: false, error: insertError.message }
                }
            }
        }

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Failed to update booking:', error)
        return { success: false, error: 'Failed to update booking' }
    }
}


export async function getVenueList(restaurantId: string) {
    try {
        const venues = await getVenues(restaurantId)
        return { success: true, data: venues }
    } catch (error) {
        console.error('Failed to fetch venues:', error)
        return { success: false, error: 'Failed to fetch venues' }
    }
}
