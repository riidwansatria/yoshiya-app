import { TodayView } from "@/components/today/today-view"
import { getReservations } from "@/lib/queries/reservations"
import { format } from "date-fns"

export default async function TodayPage({ params }: { params: Promise<{ restaurant: string }> }) {
    const { restaurant } = await params
    const today = format(new Date(), 'yyyy-MM-dd')

    const [reservations] = await Promise.all([
        getReservations(restaurant, { date: today }),
    ])

    return (
        <TodayView
            restaurantId={restaurant}
            todayStr={today}
            reservations={reservations || []}
        />
    )
}
