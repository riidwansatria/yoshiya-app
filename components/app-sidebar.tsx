"use client"

import * as React from "react"
import {
    CalendarDays,
    Users,
    ClipboardList,
    CalendarCheck,
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
} from "@/components/ui/sidebar"
import { RestaurantSwitcher } from "@/components/restaurant-switcher"
import { NavUser } from "@/components/nav-user"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
