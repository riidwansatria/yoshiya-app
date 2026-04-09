import { BookingsTable } from "@/components/bookings/bookings-table"
import { NewBookingForm } from "@/components/bookings/new-booking-form"
import { getReservations } from "@/lib/queries/reservations"
import { getUsers } from "@/lib/queries/users"
import { getVenues } from "@/lib/queries/venues"

export default async function BookingsPage({ params }: { params: Promise<{ restaurant: string }> }) {
    const { restaurant } = await params

    const [reservations, staff, venues] = await Promise.all([
        getReservations(restaurant),
        getUsers(),
        getVenues(restaurant),
    ])

    const data = reservations.map((r: any) => ({
        id: r.id,
        date: r.date,
        startTime: r.start_time,
        venueId: r.venue_id,
        partySize: r.party_size,
        status: r.status,
        customerName: r.customers?.name || 'Unknown',
        hallName: r.venues?.name || 'Unknown'
    }))

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Bookings</h1>
                <NewBookingForm restaurantId={restaurant} />
            </div>
            <BookingsTable
                data={data}
                restaurantId={restaurant}
                initialStaff={staff ?? []}
                initialVenues={venues ?? []}
            />
        </div>
    )
}
