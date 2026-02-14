
import { redirect } from "next/navigation"

export default async function DashboardPage({ params }: { params: { restaurant: string } }) {
    const { restaurant } = await params
    redirect(`/dashboard/${restaurant}/schedule`)
}
