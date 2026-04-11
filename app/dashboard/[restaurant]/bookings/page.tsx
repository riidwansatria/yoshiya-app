import { BookingsTable } from "@/components/bookings/bookings-table"
import { NewBookingForm } from "@/components/bookings/new-booking-form"
import { getReservations } from "@/lib/queries/reservations"
import { getUsers } from "@/lib/queries/users"
import { getVenues } from "@/lib/queries/venues"
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageActions, PageContent } from '@/components/layout/page'

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
                    initialStaff={staff ?? []}
                    initialVenues={venues ?? []}
                />
            </PageContent>
        </Page>
    )
}
