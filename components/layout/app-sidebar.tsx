"use client"

import * as React from "react"
import {
    CalendarDays,
    Users,
    ClipboardList,
    CalendarCheck,
    Leaf,
    Salad,
    BookOpen,
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
} from "@/components/layout/sidebar"
import { RestaurantSwitcher } from "@/components/layout/restaurant-switcher"
import { NavUser } from "@/components/layout/nav-user"

export function AppSidebar({ userRole: _userRole, ...props }: React.ComponentProps<typeof Sidebar> & { userRole?: string | null }) {
    void _userRole
    const tNav = useTranslations('nav')
    const tKitchen = useTranslations('kitchen')
    const params = useParams()
    const pathname = usePathname()

    // Default to first restaurant if none strictly present (though should be handled by redirects)
    const restaurantId = (params.restaurant as string) || 'banquet'

    const navItems = [
        {
            title: tNav('schedule'),
            url: `/dashboard/${restaurantId}/schedule`,
            icon: CalendarDays,
            active: pathname.includes('/schedule'),
        },
        {
            title: tNav('bookings'),
            url: `/dashboard/${restaurantId}/bookings`,
            icon: CalendarCheck,
            active: pathname.includes('/bookings'),
        },
        {
            title: tNav('today'),
            url: `/dashboard/${restaurantId}/today`,
            icon: ClipboardList,
            active: pathname.includes('/today'),
        },
        {
            title: tNav('customers'),
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
                {restaurantId !== 'kitchen' && (
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
                )}

                <SidebarGroup>
                    <SidebarGroupLabel>{tNav('kitchen')}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.includes('/ingredients')}
                                    tooltip={tKitchen('pages.ingredients')}
                                >
                                    <Link href={`/dashboard/${restaurantId}/ingredients`}>
                                        <Leaf />
                                        <span>{tKitchen('pages.ingredients')}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.includes('/components')}
                                    tooltip={tKitchen('pages.components')}
                                >
                                    <Link href={`/dashboard/${restaurantId}/components`}>
                                        <Salad />
                                        <span>{tKitchen('pages.components')}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.includes('/menus')}
                                    tooltip={tKitchen('pages.menus')}
                                >
                                    <Link href={`/dashboard/${restaurantId}/menus`}>
                                        <BookOpen />
                                        <span>{tKitchen('pages.menus')}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.includes('/kitchen/orders')}
                                    tooltip={tNav('dailyOrders')}
                                >
                                    <Link href={`/dashboard/${restaurantId}/kitchen/orders`}>
                                        <ClipboardPen />
                                        <span>{tNav('dailyOrders')}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.includes('/kitchen/summary')}
                                    tooltip={tNav('summary')}
                                >
                                    <Link href={`/dashboard/${restaurantId}/kitchen/summary`}>
                                        <FilePieChart />
                                        <span>{tNav('summary')}</span>
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
