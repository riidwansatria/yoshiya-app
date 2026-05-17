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
    FilePieChart,
    FileText
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
import { RestaurantSwitcher } from "@/components/layout/app-sidebar-restaurant-switcher"
import { NavUser } from "@/components/layout/app-sidebar-nav-user"
import { canAccess, type UserAccess } from "@/lib/auth/access-control"

export function AppSidebar({ access, ...props }: React.ComponentProps<typeof Sidebar> & { access?: UserAccess | null }) {
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
            module: "reservations" as const,
            permission: "reservations.read" as const,
        },
        {
            title: tNav('bookings'),
            url: `/dashboard/${restaurantId}/bookings`,
            icon: CalendarCheck,
            active: pathname.includes('/bookings'),
            module: "reservations" as const,
            permission: "reservations.read" as const,
        },
        {
            title: tNav('today'),
            url: `/dashboard/${restaurantId}/today`,
            icon: ClipboardList,
            active: pathname.includes('/today'),
            module: "reservations" as const,
            permission: "reservations.read" as const,
        },
        {
            title: tNav('customers'),
            url: `/dashboard/customers`,
            icon: Users,
            active: pathname.includes('/customers'),
            module: "reservations" as const,
            permission: "reservations.read" as const,
        },
    ].filter((item) => canAccess(access, item.module, item.permission))

    const kitchenItems = [
        {
            title: tKitchen('pages.ingredients'),
            url: `/dashboard/${restaurantId}/ingredients`,
            icon: Leaf,
            active: pathname.includes('/ingredients'),
            module: "kitchen" as const,
            permission: "kitchen.read" as const,
        },
        {
            title: tKitchen('pages.components'),
            url: `/dashboard/${restaurantId}/components`,
            icon: Salad,
            active: pathname.includes('/components'),
            module: "kitchen" as const,
            permission: "kitchen.read" as const,
        },
        {
            title: tKitchen('pages.menus'),
            url: `/dashboard/${restaurantId}/menus`,
            icon: BookOpen,
            active: pathname.includes('/menus'),
            module: "menus" as const,
            permission: "menus.read" as const,
        },
        {
            title: tNav('dailyOrders'),
            url: `/dashboard/${restaurantId}/kitchen/orders`,
            icon: ClipboardPen,
            active: pathname.includes('/kitchen/orders'),
            module: "kitchen" as const,
            permission: "kitchen.read" as const,
        },
        {
            title: tNav('summary'),
            url: `/dashboard/${restaurantId}/kitchen/summary`,
            icon: FilePieChart,
            active: pathname.includes('/kitchen/summary'),
            module: "kitchen" as const,
            permission: "kitchen.read" as const,
        },
        {
            title: tNav('purchaseOrders'),
            url: `/dashboard/${restaurantId}/kitchen/purchase-orders`,
            icon: FileText,
            active: pathname.includes('/kitchen/purchase-orders'),
            module: "procurement" as const,
            permission: "procurement.read" as const,
        },
    ].filter((item) => canAccess(access, item.module, item.permission))

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

                {kitchenItems.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupLabel>{tNav('kitchen')}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {kitchenItems.map((item) => (
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
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}

            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
