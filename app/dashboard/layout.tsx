import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
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
            <SidebarProvider>
                <AppSidebar userRole={role} className="print:hidden" />
                <SidebarInset className="h-[calc(100svh-1rem)] overflow-hidden flex flex-col print:h-auto print:overflow-visible print:block">
                    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 z-50 relative print:hidden">
                        <SidebarTrigger className="-ml-1" />
                    </header>
                    <div className="flex-1 flex flex-col overflow-y-auto print:overflow-visible print:h-auto print:block">
                        {children}
                    </div>
                </SidebarInset>
                {modal}
            </SidebarProvider>
        </SettingsProvider>
    )
}
