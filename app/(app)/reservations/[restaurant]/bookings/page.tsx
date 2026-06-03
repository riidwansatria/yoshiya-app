import { BookingsTable } from "@/components/bookings/bookings-table"
import { NewBookingForm } from "@/components/bookings/new-booking-form"
import { getReservations } from "@/lib/queries/reservations"
import { getVenues } from "@/lib/queries/venues"
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageActions, PageContent } from '@/components/layout/page'
import { requirePagePermission } from "@/lib/auth/server"

type BookingRow = {
    id: string
    date: string
    start_time: string
    venue_id: string | null
    party_size: number
    status: string
    customers?: { name: string | null } | null
    venues?: { name: string | null } | null
}

export default async function BookingsPage({ params }: { params: Promise<{ restaurant: string }> }) {
    const { restaurant } = await params
    await requirePagePermission("reservations", "reservations.read")

    const [reservations, venues] = await Promise.all([
        getReservations(restaurant),
        getVenues(restaurant),
    ])

    const data = (reservations as BookingRow[]).map((r) => ({
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
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>Bookings</PageTitle>
                </PageHeaderHeading>
                <PageActions>
                    <NewBookingForm restaurantId={restaurant} />
                </PageActions>
            </PageHeader>
            <PageContent>
                <BookingsTable
                    data={data}
                    restaurantId={restaurant}
                    initialStaff={[]}
                    initialVenues={venues ?? []}
                />
            </PageContent>
        </Page>
    )
}
