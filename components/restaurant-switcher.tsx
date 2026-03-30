"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useRouter, usePathname, useParams } from "next/navigation"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { useTranslations } from "next-intl"
import { restaurants } from "@/lib/mock-data"

export function RestaurantSwitcher() {
    const { isMobile } = useSidebar()
    const router = useRouter()
    const pathname = usePathname()
    const params = useParams()
    const t = useTranslations('restaurantSwitcher')

    const activeRestaurant = restaurants.find(r => r.id === params.restaurant) || restaurants[0]

    const getRestaurantLabel = (restaurantId: string) => {
        switch (restaurantId) {
            case 'banquet':
                return t('banquet')
            case 'fine_dining':
                return t('fineDining')
            case 'local':
                return t('local')
            case 'skewers':
                return t('skewers')
            case 'kitchen':
                return t('kitchen')
            default:
                return activeRestaurant.name
        }
    }

    const handleSwitch = (restaurantId: string) => {
        // Replace the current restaurant ID in the path with the new one
        // Assuming path starts with /dashboard/[restaurant]/...
        const currentId = params.restaurant as string
        if (!currentId) return

        // Simple replacement might be risky if ID is substring of others, but IDs are simple here.
        // Better: split path.
        const segments = pathname.split('/')
        // segments[0] is empty, segments[1] is 'dashboard', segments[2] is restaurantId
        if (segments[1] === 'dashboard' && segments[2]) {
            segments[2] = restaurantId
            router.push(segments.join('/'))
        }
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                <span className="text-lg">{activeRestaurant.icon}</span>
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">
                                    {getRestaurantLabel(activeRestaurant.id)}
                                </span>
                                <span className="truncate text-xs">{t('subtitle')}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        {restaurants.map((restaurant) => (
                            <DropdownMenuItem
                                key={restaurant.id}
                                onClick={() => handleSwitch(restaurant.id)}
                                className="gap-2 p-2"
                            >
                                <div className="flex size-6 items-center justify-center rounded-sm border">
                                    {restaurant.icon}
                                </div>
                                {getRestaurantLabel(restaurant.id)}
                                {activeRestaurant.id === restaurant.id && (
                                    <Check className="ml-auto h-4 w-4" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
