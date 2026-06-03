"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Restaurant } from "@/lib/queries/restaurants"

type RestaurantContextSelectProps = {
    restaurants: Restaurant[]
    selectedRestaurantId?: string | null
    className?: string
}

export function RestaurantContextSelect({
    restaurants,
    selectedRestaurantId,
    className,
}: RestaurantContextSelectProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const t = useTranslations("restaurantContext")

    const handleValueChange = (restaurantId: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("restaurant", restaurantId)
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className={className}>
            <Select value={selectedRestaurantId ?? ""} onValueChange={handleValueChange}>
                <SelectTrigger className="min-w-48">
                    <SelectValue placeholder={t("placeholder")} />
                </SelectTrigger>
                <SelectContent>
                    {restaurants.map((restaurant) => (
                        <SelectItem key={restaurant.id} value={restaurant.id}>
                            <span>{restaurant.icon ?? "•"}</span>
                            <span>{restaurant.name}</span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}

export function RestaurantRequiredState({
    restaurants,
}: {
    restaurants: Restaurant[]
}) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const t = useTranslations("restaurantContext")

    const buildHref = (restaurantId: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("restaurant", restaurantId)
        return `${pathname}?${params.toString()}`
    }

    return (
        <div className="flex min-h-full items-center justify-center p-6">
            <div className="w-full max-w-xl space-y-5 rounded-lg border bg-background p-6 shadow-xs">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{t("requiredTitle")}</h2>
                    <p className="text-sm text-muted-foreground">{t("requiredDescription")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {restaurants.map((restaurant) => (
                        <Button key={restaurant.id} variant="outline" asChild>
                            <Link href={buildHref(restaurant.id)}>
                                <span>{restaurant.icon ?? "•"}</span>
                                {restaurant.name}
                            </Link>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    )
}
