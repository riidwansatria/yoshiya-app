import { BookingsTable } from "@/components/bookings/bookings-table"
import { NewBookingForm } from "@/components/bookings/new-booking-form"
import { getReservations } from "@/lib/queries/reservations"

export default async function BookingsPage({ params }: { params: Promise<{ restaurant: string }> }) {
    const { restaurant } = await params

    const reservations = await getReservations(restaurant)

    const data = reservations.map((r: any) => ({
        id: r.id,
        date: r.date,
        startTime: r.start_time,
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
            <BookingsTable data={data} restaurantId={restaurant} />
        </div>
    )
}
