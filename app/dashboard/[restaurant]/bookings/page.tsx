import { BookingsTable } from "@/components/bookings/bookings-table"
import { NewBookingForm } from "@/components/bookings/new-booking-form"
import { reservations, customers, halls } from "@/lib/mock-data"

export default async function BookingsPage({ params }: { params: Promise<{ restaurant: string }> }) {
    const { restaurant } = await params

    const data = reservations
        .filter(r => r.restaurant === restaurant)
        .map(r => ({
            ...r,
            customerName: customers.find(c => c.id === r.customerId)?.name || 'Unknown',
            hallName: halls.find(h => h.id === r.hallId)?.name || 'Unknown',
            status: r.status
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
