import { ScheduleGridTransposed } from "@/components/schedule/schedule-grid-transposed"
import { NewReservationButton } from "@/components/schedule/new-reservation-button"
import { Page, PageActions, PageContent, PageHeader, PageHeaderHeading, PageTitle } from "@/components/layout/page"
import { getReservations } from "@/lib/queries/reservations"
import { getVenuesWithConcurrent } from "@/lib/queries/venues"
import { format } from "date-fns"
import { getTranslations } from "next-intl/server"
import { redirect } from "next/navigation"
import { requirePagePermission } from "@/lib/auth/server"

export default async function SchedulePage({
    params,
    searchParams,
}: {
    params: Promise<{ restaurant: string }>
    searchParams: Promise<{ date?: string }>
}) {
    const { restaurant } = await params
    const { date } = await searchParams
    await requirePagePermission("reservations", "reservations.read")

    if (!date) {
        const today = format(new Date(), 'yyyy-MM-dd')
        redirect(`/dashboard/${restaurant}/schedule?date=${today}`)
    }

    const t = await getTranslations('nav')

    const currentDate = date

    const [venues, reservations] = await Promise.all([
        getVenuesWithConcurrent(restaurant),
        getReservations(restaurant, { date: currentDate }),
    ])

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t('schedule')}</PageTitle>
                </PageHeaderHeading>
                <PageActions>
                    <NewReservationButton
                        restaurantId={restaurant}
                        defaultDate={currentDate}
                        initialStaff={[]}
                        initialVenues={venues || []}
                    />
                </PageActions>
            </PageHeader>
            <PageContent className="p-0 md:p-0">
                <ScheduleGridTransposed
                    restaurantId={restaurant}
                    dateStr={currentDate}
                    initialVenues={venues || []}
                    initialReservations={reservations || []}
                    initialStaff={[]}
                />
            </PageContent>
        </Page>
    )
}
