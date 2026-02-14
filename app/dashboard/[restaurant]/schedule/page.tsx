import { ScheduleGrid } from "@/components/schedule/schedule-grid"
import { getReservations } from "@/lib/queries/reservations"
import { getVenues } from "@/lib/queries/venues"
import { format } from "date-fns"

export default async function SchedulePage({
    params,
    searchParams,
}: {
    params: Promise<{ restaurant: string }>
    searchParams: Promise<{ date?: string }>
}) {
    const { restaurant } = await params
    const { date } = await searchParams

    // Default to today if no date provided
    const currentDate = date || format(new Date(), 'yyyy-MM-dd')

    const [venues, reservations] = await Promise.all([
        getVenues(restaurant),
        getReservations(restaurant, { date: currentDate }),
    ])

    return (
        <ScheduleGrid
            restaurantId={restaurant}
            dateStr={currentDate}
            initialVenues={venues || []}
            initialReservations={reservations || []}
        />
    )
}
