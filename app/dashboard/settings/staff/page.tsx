import { getAllStaff, getUserRole } from "@/lib/queries/users"
import { StaffTable } from "@/components/settings/staff-table"
import { redirect } from "next/navigation"
import { Separator } from "@/components/ui/separator"

export default async function StaffPage() {
    const role = await getUserRole()

    // Redirect if not manager
    // In dev mode, maybe relax this or ensure we have manager role
    // For now strict check
    if (role !== 'manager') {
        redirect('/dashboard') // Or some error page
    }

    const staff = await getAllStaff()

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
                    <p className="text-muted-foreground">
                        Manage registered staff accounts and booking assignment visibility.
                    </p>
                </div>
            </div>
            <Separator />
            <StaffTable data={staff} />
        </div>
    )
}
