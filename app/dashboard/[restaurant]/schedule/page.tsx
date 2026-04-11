import { ScheduleGrid } from "@/components/schedule/schedule-grid"
import { PageFull } from "@/components/layout/page"
import { getReservations } from "@/lib/queries/reservations"
import { getUsers } from "@/lib/queries/users"
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

    const [venues, reservations, staff] = await Promise.all([
        getVenues(restaurant),
        getReservations(restaurant, { date: currentDate }),
        getUsers(),
    ])

    return (
        <PageFull>
            <ScheduleGrid
                restaurantId={restaurant}
                dateStr={currentDate}
                initialVenues={venues || []}
                initialReservations={reservations || []}
                initialStaff={staff || []}
            />
        </PageFull>
    )
}
