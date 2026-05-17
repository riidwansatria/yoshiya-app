import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SettingsProvider } from "@/components/settings/settings-context"
import { getMenuTagsWithCount } from "@/lib/queries/menu-tags"
import { getAllPurchaseOrderSettings } from "@/lib/queries/purchase-orders"
import { getAllStaff } from "@/lib/queries/users"
import { getVendors } from "@/lib/queries/vendors"
import { canAccess } from "@/lib/auth/access-control"
import { getCurrentUserAccess } from "@/lib/auth/server"
import type { SettingsSection } from "@/components/settings/types"

export default async function DashboardLayout({
    children,
    modal,
}: {
    children: React.ReactNode
    modal: React.ReactNode
}) {
    const currentAccess = await getCurrentUserAccess()
    const access = currentAccess
        ? {
            role: currentAccess.role,
            modules: currentAccess.modules,
            permissions: currentAccess.permissions,
        }
        : null
    const canManageMenuTags = canAccess(access, "menus", "menus.update")
    const canManageProcurement = canAccess(access, "procurement", "procurement.update")
    const canManageStaff = canAccess(access, "staff_management", "staff.manage")
    const allowedSections: SettingsSection[] = [
        "language",
        ...(canManageMenuTags ? ["menu-tags" as const] : []),
        ...(canManageProcurement ? ["purchase-orders" as const, "vendors" as const] : []),
        ...(canManageStaff ? ["staff" as const] : []),
    ]

    const [staff, menuTags, purchaseOrderSettings, vendors] = await Promise.all([
        canManageStaff ? getAllStaff() : Promise.resolve([]),
        canManageMenuTags ? getMenuTagsWithCount() : Promise.resolve([]),
        canManageProcurement ? getAllPurchaseOrderSettings() : Promise.resolve([]),
        canManageProcurement ? getVendors() : Promise.resolve([]),
    ])

    return (
        <SettingsProvider
            allowedSections={allowedSections}
            menuTags={menuTags}
            purchaseOrderSettings={purchaseOrderSettings}
            staff={staff}
            vendors={vendors}
        >
            <SidebarProvider style={{ "--sidebar-width": "12rem" } as React.CSSProperties}>
                <AppSidebar access={access} className="print:hidden" />
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
