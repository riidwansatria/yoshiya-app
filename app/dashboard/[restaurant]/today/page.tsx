import { TodayView } from "@/components/today/today-view"

export default async function TodayPage({ params }: { params: Promise<{ restaurant: string }> }) {
    const { restaurant } = await params
    return <TodayView restaurantId={restaurant} />
}
