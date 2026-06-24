"use client"

import * as React from "react"
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock,
    MapPin,
    Printer,
    Utensils,
    Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookingDetailModal } from "@/components/bookings/booking-detail-modal"
import { Page, PageActions, PageContent, PageDescription, PageHeader, PageHeaderHeading, PageTitle } from "@/components/layout/page"
import { cn } from "@/lib/utils"

type ReservationMenu = {
    id: string
    menu_name: string | null
    quantity: number | null
    notes: string | null
}

type ReservationStaff = {
    role: string | null
    temp_name: string | null
    users: { name: string | null } | null
}

type TodayReservation = {
    id: string
    start_time: string | null
    end_time: string | null
    party_size: number | null
    status: string | null
    notes: string | null
    customers: { name: string | null } | null
    venues: { name: string | null; capacity: number | null } | null
    reservation_menus: ReservationMenu[] | null
    reservation_staff: ReservationStaff[] | null
}

interface TodayViewProps {
    restaurantId: string
    todayStr: string
    reservations: TodayReservation[]
}

function toMinutes(time: string | null) {
    if (!time) return Number.POSITIVE_INFINITY
    const [hours, minutes] = time.split(":").map(Number)
    return (hours || 0) * 60 + (minutes || 0)
}

function formatTime(time: string | null) {
    return time ? time.substring(0, 5) : "--:--"
}

function getQuantity(value: number | null) {
    return value ?? 0
}

function normalizeStatus(status: string | null) {
    return status ?? "pending"
}

type StatusLabels = {
    pending: string
    confirmed: string
    deposit_paid: string
    completed: string
    cancelled: string
}

type TodayCopy = {
    unknownCustomer: string
    unknownVenue: string
    noMenus: string
    noNotes: string
    pax: (count: number) => string
}

function StatusBadge({ status, labels }: { status: string; labels: StatusLabels }) {
    const label = status in labels ? labels[status as keyof StatusLabels] : status
    return (
        <Badge
            variant="outline"
            className={cn(
                "capitalize",
                status === "confirmed" && "border-blue-200 bg-blue-50 text-blue-700",
                status === "deposit_paid" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                status === "completed" && "border-zinc-200 bg-zinc-50 text-zinc-700",
                status === "pending" && "border-amber-200 bg-amber-50 text-amber-800",
                status === "cancelled" && "border-red-200 bg-red-50 text-red-700"
            )}
        >
            {label}
        </Badge>
    )
}

function ReservationRow({
    reservation,
    statusLabels,
    copy,
    onSelect,
}: {
    reservation: TodayReservation
    statusLabels: StatusLabels
    copy: TodayCopy
    onSelect: (reservationId: string) => void
}) {
    const status = normalizeStatus(reservation.status)
    const customer = reservation.customers?.name ?? copy.unknownCustomer
    const venue = reservation.venues?.name ?? copy.unknownVenue
    const menuText = reservation.reservation_menus?.length
        ? reservation.reservation_menus.map((menu) => `${menu.menu_name ?? copy.noMenus} x${getQuantity(menu.quantity)}`).join(", ")
        : copy.noMenus
    const serviceStaff = reservation.reservation_staff
        ?.filter((staff) => staff.role === "service")
        .map((staff) => staff.users?.name ?? staff.temp_name)
        .filter(Boolean)

    return (
        <button
            type="button"
            onClick={() => onSelect(reservation.id)}
            className={cn(
                "group grid w-full gap-3 px-4 py-3 text-left transition hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring md:grid-cols-[92px_1fr_180px_24px]",
                status === "cancelled" && "bg-muted/50 text-muted-foreground"
            )}
        >
            <span className="font-mono text-sm font-semibold tabular-nums">
                {formatTime(reservation.start_time)}
                <span className="block text-xs font-normal text-muted-foreground">{formatTime(reservation.end_time)}</span>
            </span>
            <span className="min-w-0 space-y-1">
                <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{customer}</span>
                    <StatusBadge status={status} labels={statusLabels} />
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {venue}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {copy.pax(getQuantity(reservation.party_size))}
                    </span>
                </span>
                <span className="block truncate text-sm text-muted-foreground">{menuText}</span>
                {serviceStaff && serviceStaff.length > 0 && (
                    <span className="block text-xs text-muted-foreground">{serviceStaff.join(", ")}</span>
                )}
            </span>
            <span className="text-sm text-muted-foreground md:text-right">
                {reservation.notes?.trim() || copy.noNotes}
            </span>
            <span className="hidden items-center justify-end text-muted-foreground transition group-hover:text-foreground md:flex">
                <ChevronRight className="h-4 w-4" />
            </span>
        </button>
    )
}

function MetricCard({
    icon: Icon,
    label,
    value,
    tone = "default",
}: {
    icon: LucideIcon
    label: string
    value: number
    tone?: "default" | "warning" | "ok"
}) {
    return (
        <div className="rounded-lg border bg-background px-4 py-3 shadow-xs">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-xs font-medium text-muted-foreground">{label}</div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
                </div>
                <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md border",
                    tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
                    tone === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                    tone === "default" && "bg-muted text-muted-foreground"
                )}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
        </div>
    )
}

export function TodayView({ restaurantId, todayStr, reservations }: TodayViewProps) {
    const t = useTranslations("today")
    const locale = useLocale()
    const [selectedReservationId, setSelectedReservationId] = React.useState<string | null>(null)
    const sortedReservations = React.useMemo(
        () => [...reservations].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time)),
        [reservations]
    )
    const activeReservations = sortedReservations.filter((reservation) => normalizeStatus(reservation.status) !== "cancelled")
    const totalGuests = activeReservations.reduce((sum, reservation) => sum + getQuantity(reservation.party_size), 0)
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const isToday = todayStr === [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("-")
    const nextReservation =
        activeReservations.find((reservation) => !isToday || toMinutes(reservation.start_time) >= nowMinutes) ??
        null

    const menuTotals = activeReservations.reduce((totals, reservation) => {
        reservation.reservation_menus?.forEach((menu) => {
            const name = menu.menu_name?.trim() || t("noMenus")
            totals.set(name, (totals.get(name) ?? 0) + getQuantity(menu.quantity))
        })
        return totals
    }, new Map<string, number>())

    const venueTotals = activeReservations.reduce((totals, reservation) => {
        const name = reservation.venues?.name ?? t("unknownVenue")
        const current = totals.get(name) ?? { reservations: 0, guests: 0 }
        totals.set(name, {
            reservations: current.reservations + 1,
            guests: current.guests + getQuantity(reservation.party_size),
        })
        return totals
    }, new Map<string, { reservations: number; guests: number }>())

    const attentionItems = activeReservations.flatMap((reservation) => {
        const customer = reservation.customers?.name ?? t("unknownCustomer")
        const time = formatTime(reservation.start_time)
        const items: Array<{ key: string; time: string; customer: string; label: string; detail: string }> = []

        if (normalizeStatus(reservation.status) === "pending") {
            items.push({
                key: `${reservation.id}-pending`,
                time,
                customer,
                label: t("status.pending"),
                detail: t("attentionItems"),
            })
        }

        if (!reservation.reservation_menus?.length) {
            items.push({
                key: `${reservation.id}-menu`,
                time,
                customer,
                label: t("missingMenu"),
                detail: t("noMenus"),
            })
        }

        if (reservation.notes?.trim()) {
            items.push({
                key: `${reservation.id}-note`,
                time,
                customer,
                label: t("reservationNote"),
                detail: reservation.notes.trim(),
            })
        }

        reservation.reservation_menus?.forEach((menu) => {
            if (!menu.notes?.trim()) return
            items.push({
                key: `${reservation.id}-menu-note-${menu.id}`,
                time,
                customer,
                label: t("menuNote"),
                detail: `${menu.menu_name ?? t("noMenus")}: ${menu.notes.trim()}`,
            })
        })

        return items
    })

    const formattedDate = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date(`${todayStr}T00:00:00`))

    const handlePrint = () => {
        window.print()
    }

    const statusLabels = {
        pending: t("status.pending"),
        confirmed: t("status.confirmed"),
        deposit_paid: t("status.deposit_paid"),
        completed: t("status.completed"),
        cancelled: t("status.cancelled"),
    }
    const copy = {
        unknownCustomer: t("unknownCustomer"),
        unknownVenue: t("unknownVenue"),
        noMenus: t("noMenus"),
        noNotes: t("noNotes"),
        pax: (count: number) => t("pax", { count }),
    }

    return (
        <Page>
            <PageHeader className="no-print">
                <PageHeaderHeading>
                    <PageTitle>{t("title")}</PageTitle>
                    <PageDescription>{formattedDate}</PageDescription>
                </PageHeaderHeading>
                <PageActions>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        {t("print")}
                    </Button>
                </PageActions>
            </PageHeader>
            <PageContent className="bg-muted/20">
                {activeReservations.length === 0 ? (
                    <div className="flex min-h-full items-center justify-center">
                        <div className="w-full max-w-md rounded-lg border bg-background p-6 text-center shadow-xs">
                            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
                            <h2 className="text-lg font-semibold">{t("emptyTitle")}</h2>
                            <p className="mt-2 text-sm text-muted-foreground">{t("emptyDescription")}</p>
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 print:max-w-none">
                        <div className="grid gap-3 md:grid-cols-4">
                            <MetricCard icon={CalendarDays} label={t("reservations")} value={activeReservations.length} />
                            <MetricCard icon={Users} label={t("guests")} value={totalGuests} />
                            <MetricCard icon={Utensils} label={t("menus")} value={menuTotals.size} />
                            <MetricCard icon={AlertTriangle} label={t("attentionItems")} value={attentionItems.length} tone={attentionItems.length ? "warning" : "ok"} />
                        </div>

                        <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
                            <Card className="rounded-lg">
                                <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                                    <CardTitle className="text-base">{t("timeline")}</CardTitle>
                                    {nextReservation ? (
                                        <Badge variant="outline" className="gap-1">
                                            <Clock className="h-3 w-3" />
                                            {t("nextService")}: {formatTime(nextReservation.start_time)}
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">{t("noNextService")}</Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {sortedReservations.map((reservation) => (
                                            <ReservationRow
                                                key={reservation.id}
                                                reservation={reservation}
                                                statusLabels={statusLabels}
                                                copy={copy}
                                                onSelect={setSelectedReservationId}
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid gap-3">
                                <Card className="rounded-lg">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{t("menuSummary")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {menuTotals.size > 0 ? (
                                            Array.from(menuTotals.entries()).map(([name, quantity]) => (
                                                <div key={name} className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                                    <span className="truncate text-sm font-medium">{name}</span>
                                                    <span className="text-sm font-semibold tabular-nums">{quantity}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">{t("noMenus")}</p>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="rounded-lg">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{t("venueLoad")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {Array.from(venueTotals.entries()).map(([name, totals]) => (
                                            <div key={name} className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-medium">{name}</div>
                                                    <div className="text-xs text-muted-foreground">{t("reservationsCount", { count: totals.reservations })}</div>
                                                </div>
                                                <span className="text-sm font-semibold tabular-nums">{t("pax", { count: totals.guests })}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card className="rounded-lg">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{t("attention")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {attentionItems.length > 0 ? (
                                            attentionItems.map((item) => (
                                                <div key={item.key} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-medium">{item.time} {item.customer}</span>
                                                        <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-900">
                                                            {item.label}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-1 text-xs leading-relaxed">{item.detail}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">{t("noAttention")}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </PageContent>
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    [data-slot="sidebar"], [data-sidebar="sidebar"] { display: none !important; }
                    body { background: white !important; }
                    [data-slot="page-content"] { padding: 0 !important; overflow: visible !important; }
                    .print\\:max-w-none { max-width: none !important; }
                }
            `}</style>
            <BookingDetailModal
                bookingId={selectedReservationId}
                open={!!selectedReservationId}
                onOpenChange={(open) => !open && setSelectedReservationId(null)}
                restaurantId={restaurantId}
                defaultDate={todayStr}
                onDeleted={() => setSelectedReservationId(null)}
            />
        </Page>
    )
}
