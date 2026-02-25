"use client"

import * as React from "react"
import {
    CalendarDays,
    Users,
    ClipboardList,
    CalendarCheck,
    UserCog,
    Settings,
    UtensilsCrossed,
    Leaf,
    BookOpen,
    Menu as MenuIcon,
    ClipboardPen,
    FilePieChart
} from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { RestaurantSwitcher } from "@/components/restaurant-switcher"
import { NavUser } from "@/components/nav-user"

export function AppSidebar({ userRole, ...props }: React.ComponentProps<typeof Sidebar> & { userRole?: string | null }) {
    const t = useTranslations('nav')
    const params = useParams()
    const pathname = usePathname()

    // Default to first restaurant if none strictly present (though should be handled by redirects)
    const restaurantId = (params.restaurant as string) || 'banquet'

    const navItems = [
        {
            title: t('schedule'),
            url: `/dashboard/${restaurantId}/schedule`,
            icon: CalendarDays,
            active: pathname.includes('/schedule'),
        },
        {
            title: t('bookings'),
            url: `/dashboard/${restaurantId}/bookings`,
            icon: CalendarCheck,
            active: pathname.includes('/bookings'),
        },
        {
            title: t('today'),
            url: `/dashboard/${restaurantId}/today`,
            icon: ClipboardList,
            active: pathname.includes('/today'),
        },
        {
            title: t('customers'),
            url: `/dashboard/customers`,
            icon: Users,
            active: pathname.includes('/customers'),
        },
    ]

    return (
        <Sidebar collapsible="icon" variant="inset" {...props}>
            <SidebarHeader>
                <RestaurantSwitcher />
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu className="gap-2 p-2">
                    {navItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={item.active} tooltip={item.title}>
                                <Link href={item.url}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>

                {userRole === 'manager' && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Settings</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname.includes('/settings/staff')}
                                        tooltip="Staff Management"
                                    >
                                        <Link href="/dashboard/settings/staff">
                                            <UserCog />
                                            <span>Staff Management</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}

                <SidebarGroup>
                    <SidebarGroupLabel>Kitchen</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.includes('/ingredients')}
                                    tooltip="Ingredients"
                                >
                                    <Link href={`/dashboard/${restaurantId}/ingredients`}>
                                        <Leaf />
                                        <span>Ingredients</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.includes('/components')}
                                    tooltip="Components"
                                >
                                    <Link href={`/dashboard/${restaurantId}/components`}>
                                        <BookOpen />
                                        <span>Components</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.includes('/menus')}
                                    tooltip="Menus"
                                >
                                    <Link href={`/dashboard/${restaurantId}/menus`}>
                                        <MenuIcon />
                                        <span>Menus</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.includes('/kitchen/orders')}
                                    tooltip="Daily Orders"
                                >
                                    <Link href={`/dashboard/${restaurantId}/kitchen/orders`}>
                                        <ClipboardPen />
                                        <span>Daily Orders</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.includes('/kitchen/summary')}
                                    tooltip="Ingredients Summary"
                                >
                                    <Link href={`/dashboard/${restaurantId}/kitchen/summary`}>
                                        <FilePieChart />
                                        <span>Summary</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
