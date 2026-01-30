import { ScheduleGrid } from "@/components/schedule/schedule-grid"

export default async function SchedulePage({
    params,
}: {
    params: Promise<{ restaurant: string }>
}) {
    const { restaurant } = await params
    return <ScheduleGrid restaurantId={restaurant} />
}
