
import { redirect } from "next/navigation"
import { getDefaultDashboardPath } from "@/lib/auth/access-control"
import { getCurrentUserAccess } from "@/lib/auth/server"

export default async function DashboardPage() {
    const access = await getCurrentUserAccess()
    redirect(getDefaultDashboardPath(access))
}
