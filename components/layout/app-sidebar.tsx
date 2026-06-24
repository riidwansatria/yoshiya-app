"use client"

import * as React from "react"
import {
    CalendarDays,
    Users,
    ClipboardList,
    CalendarCheck,
    Building2,
    Leaf,
    Salad,
    BookOpen,
    ClipboardPen,
    FilePieChart,
    FileText,
    Globe2,
    WandSparkles,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import Image from "next/image"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { NavUser } from "@/components/layout/app-sidebar-nav-user"
import { canAccess, isAdminRole, type UserAccess } from "@/lib/auth/access-control"
import {
    buildDashboardComponentsPath,
    buildDashboardIngredientsPath,
    buildDashboardKitchenOrdersPath,
    buildDashboardKitchenImportPath,
    buildDashboardKitchenSummaryPath,
    buildDashboardMenusPath,
    buildDashboardPurchaseOrdersPath,
    buildDashboardReservationsBookingsPath,
    buildDashboardReservationsSchedulePath,
    buildDashboardReservationsTodayPath,
} from "@/lib/constants/routes"
import type { Restaurant } from "@/lib/queries/restaurants"

export function AppSidebar({
    access,
    restaurants,
    userDisplayName,
    userEmail,
    ...props
}: React.ComponentProps<typeof Sidebar> & {
    access?: UserAccess | null
    restaurants?: Restaurant[]
    userDisplayName?: string | null
    userEmail?: string | null
}) {
    const tNav = useTranslations('nav')
    const tKitchen = useTranslations('kitchen')
    const tRestaurant = useTranslations('restaurantContext')
    const router = useRouter()
    const params = useParams()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const restaurantOptions = restaurants ?? []
    const [rememberedRestaurantId, setRememberedRestaurantId] = React.useState<string | null>(null)
    const fallbackRestaurantId =
        restaurantOptions.find((restaurant) => restaurant.id === "enkaijou")?.id ??
        restaurantOptions[0]?.id ??
        "enkaijou"

    const selectedRestaurantId =
        (params.restaurant as string | undefined) ??
        searchParams.get("restaurant")
    const validRememberedRestaurantId =
        restaurantOptions.find((restaurant) => restaurant.id === rememberedRestaurantId)?.id ??
        null
    const selectedRestaurant =
        restaurantOptions.find((restaurant) => restaurant.id === selectedRestaurantId) ??
        null
    const contextRestaurantId = selectedRestaurant?.id ?? validRememberedRestaurantId
    const restaurantId = contextRestaurantId ?? fallbackRestaurantId
    const isRestaurantScopedPage = pathname.startsWith("/reservations") || pathname.startsWith("/kitchen")

    React.useEffect(() => {
        setRememberedRestaurantId(window.localStorage.getItem("yoshiya:selectedRestaurant"))
    }, [])

    React.useEffect(() => {
        if (!selectedRestaurant?.id) return
        window.localStorage.setItem("yoshiya:selectedRestaurant", selectedRestaurant.id)
        setRememberedRestaurantId(selectedRestaurant.id)
    }, [selectedRestaurant?.id])

    const buildRestaurantContextHref = (nextRestaurantId: string) => {
        const nextSearchParams = new URLSearchParams(searchParams.toString())

        if (pathname.startsWith("/reservations")) {
            const segments = pathname.split("/")
            segments[2] = nextRestaurantId
            const queryString = nextSearchParams.toString()
            return `${segments.join("/")}${queryString ? `?${queryString}` : ""}`
        }

        nextSearchParams.set("restaurant", nextRestaurantId)
        return `${pathname}?${nextSearchParams.toString()}`
    }

    const handleRestaurantChange = (nextRestaurantId: string) => {
        window.localStorage.setItem("yoshiya:selectedRestaurant", nextRestaurantId)
        setRememberedRestaurantId(nextRestaurantId)
        router.push(buildRestaurantContextHref(nextRestaurantId))
    }

    const navItems = [
        {
            title: tNav('schedule'),
            url: buildDashboardReservationsSchedulePath(restaurantId),
            icon: CalendarDays,
            active: pathname.startsWith('/reservations') && pathname.includes('/schedule'),
            module: "reservations" as const,
            permission: "reservations.read" as const,
        },
        {
            title: tNav('bookings'),
            url: buildDashboardReservationsBookingsPath(restaurantId),
            icon: CalendarCheck,
            active: pathname.startsWith('/reservations') && pathname.includes('/bookings'),
            module: "reservations" as const,
            permission: "reservations.read" as const,
        },
        {
            title: tNav('today'),
            url: buildDashboardReservationsTodayPath(restaurantId),
            icon: ClipboardList,
            active: pathname.startsWith('/reservations') && pathname.includes('/today'),
            module: "reservations" as const,
            permission: "reservations.read" as const,
        },
        {
            title: tNav('customers'),
            url: `/customers`,
            icon: Users,
            active: pathname.includes('/customers'),
            module: "reservations" as const,
            permission: "reservations.read" as const,
        },
    ].filter((item) => canAccess(access, item.module, item.permission))

    const kitchenItems = [
        {
            title: tKitchen('pages.ingredients'),
            url: buildDashboardIngredientsPath(contextRestaurantId),
            icon: Leaf,
            active: pathname.startsWith('/kitchen/ingredients'),
            module: "kitchen" as const,
            permission: "kitchen.read" as const,
        },
        {
            title: tKitchen('pages.components'),
            url: buildDashboardComponentsPath(contextRestaurantId),
            icon: Salad,
            active: pathname.startsWith('/kitchen/components'),
            module: "kitchen" as const,
            permission: "kitchen.read" as const,
        },
        {
            title: tKitchen('pages.menus'),
            url: buildDashboardMenusPath(contextRestaurantId),
            icon: BookOpen,
            active: pathname.startsWith('/kitchen/menus'),
            module: "menus" as const,
            permission: "menus.read" as const,
        },
        ...(isAdminRole(access)
            ? [{
                title: tKitchen('pages.csvImport'),
                url: buildDashboardKitchenImportPath(contextRestaurantId),
                icon: WandSparkles,
                active: pathname.startsWith('/kitchen/import'),
                module: "kitchen" as const,
                permission: "kitchen.read" as const,
            }]
            : []),
        {
            title: tNav('dailyOrders'),
            url: buildDashboardKitchenOrdersPath(contextRestaurantId),
            icon: ClipboardPen,
            active: pathname.startsWith('/kitchen/orders'),
            module: "kitchen" as const,
            permission: "kitchen.read" as const,
        },
        {
            title: tNav('summary'),
            url: buildDashboardKitchenSummaryPath(contextRestaurantId),
            icon: FilePieChart,
            active: pathname.startsWith('/kitchen/summary'),
            module: "kitchen" as const,
            permission: "kitchen.read" as const,
        },
        {
            title: tNav('purchaseOrders'),
            url: buildDashboardPurchaseOrdersPath(),
            icon: FileText,
            active: pathname.startsWith('/procurement/purchase-orders'),
            module: "procurement" as const,
            permission: "procurement.read" as const,
        },
    ].filter((item) => canAccess(access, item.module, item.permission))

    return (
        <Sidebar collapsible="icon" variant="inset" {...props}>
            <SidebarHeader className="gap-2 p-2 bg-background rounded-xl border ">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="py-2">
                            <Link href="/">
                                <Image 
                                    src="/yoshiya-logo.png" 
                                    alt="Yoshiya" 
                                    width={140} 
                                    height={50} 
                                    className="object-contain group-data-[collapsible=icon]:hidden w-auto h-auto max-h-12"
                                />
                                <div className="hidden aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:flex">
                                    <Building2 className="size-4" />
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <div className="h-10 group-data-[collapsible=icon]:hidden">
                    {isRestaurantScopedPage && restaurantOptions.length > 1 ? (
                        <Select value={selectedRestaurantId ?? ""} onValueChange={handleRestaurantChange}>
                            <SelectTrigger className="h-10 w-full">
                                <SelectValue placeholder={tRestaurant("placeholder")} />
                            </SelectTrigger>
                            <SelectContent className="shadow-none">
                                {restaurantOptions.map((restaurant) => (
                                    <SelectItem key={restaurant.id} value={restaurant.id}>
                                        <span>{restaurant.icon ?? "•"}</span>
                                        <span>{restaurant.name}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="flex h-10 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground">
                            {isRestaurantScopedPage ? (
                                <>
                                    <Building2 className="size-4" />
                                    <span className="truncate">
                                        {selectedRestaurant?.name ?? tRestaurant("placeholder")}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Globe2 className="size-4" />
                                    <span className="truncate">{tRestaurant("global")}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
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
                <NavUser displayName={userDisplayName} email={userEmail} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
