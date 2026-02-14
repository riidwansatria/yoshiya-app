import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getUserRole } from "@/lib/queries/users"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const role = await getUserRole()

    return (

        <SidebarProvider>
            <AppSidebar userRole={role} />
            <SidebarInset className="h-[calc(100svh-1rem)] overflow-hidden flex flex-col">
                <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 z-50 relative">
                    <SidebarTrigger className="-ml-1" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="#">Yoshiya App</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Dashboard</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </header>
                <div className="flex-1 flex flex-col overflow-hidden">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
