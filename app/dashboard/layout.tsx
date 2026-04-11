import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SettingsProvider } from "@/components/settings/settings-context"
import { getMenuTagsWithCount } from "@/lib/queries/menu-tags"
import { getAllStaff, getUserRole } from "@/lib/queries/users"

export default async function DashboardLayout({
    children,
    modal,
}: {
    children: React.ReactNode
    modal: React.ReactNode
}) {
    const role = await getUserRole()
    const [staff, menuTags] = await Promise.all([
        role === "manager" ? getAllStaff() : Promise.resolve([]),
        getMenuTagsWithCount(),
    ])

    return (
        <SettingsProvider menuTags={menuTags} staff={staff} userRole={role}>
            <SidebarProvider style={{ "--sidebar-width": "12rem" } as React.CSSProperties}>
                <AppSidebar userRole={role} className="print:hidden" />
                <SidebarInset className="h-[calc(100svh-1rem)] overflow-hidden flex flex-col">
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {children}
                    </div>
                </SidebarInset>
                {modal}
            </SidebarProvider>
        </SettingsProvider>
    )
}
