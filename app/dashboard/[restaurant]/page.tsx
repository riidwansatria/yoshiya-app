
import { redirect } from "next/navigation"
import { getDefaultDashboardPath } from "@/lib/auth/access-control"
import { getCurrentUserAccess } from "@/lib/auth/server"

export default async function DashboardPage({ params }: { params: Promise<{ restaurant: string }> }) {
    const { restaurant } = await params
    const access = await getCurrentUserAccess()
    redirect(getDefaultDashboardPath(access, restaurant))
}
