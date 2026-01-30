"use client"

import * as React from "react"
import { format, addDays, subDays } from "date-fns"
import { ja } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { halls, reservations, customers } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { BookingDetailModal } from "@/components/bookings/booking-detail-modal"

interface ScheduleGridProps {
    restaurantId: string
}

export function ScheduleGrid({ restaurantId }: ScheduleGridProps) {
    // Default mock date as per spec
    const [date, setDate] = React.useState(new Date(2026, 0, 30)) // Jan 30, 2026

    const restaurantHalls = halls.filter(h => h.restaurant === restaurantId)

    // Time range: 11:00 to 22:00
    const startHour = 11
    const endHour = 22
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)

    // Filter reservations for this day and restaurant
    const dailyReservations = reservations.filter(r =>
        r.restaurant === restaurantId &&
        r.date === format(date, 'yyyy-MM-dd')
    )


    const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null)

    const handlePrevDay = () => setDate(d => subDays(d, 1))
    const handleNextDay = () => setDate(d => addDays(d, 1))

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header / Date Navigator */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={handlePrevDay}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-xl font-bold">
                        {format(date, 'yyyy/MM/dd (E)', { locale: ja })}
                    </div>
                    <Button variant="outline" size="icon" onClick={handleNextDay}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div>
                    <Button variant="secondary">Day View</Button>
                </div>
            </div>

            {/* Grid Container */}
            <div className="border rounded-md overflow-x-auto flex-1 bg-white">
                <div className="min-w-[800px] grid" style={{
                    gridTemplateColumns: `80px repeat(${restaurantHalls.length}, 1fr)`
                }}>
                    {/* Header Row */}
                    <div className="p-2 border-b border-r bg-muted font-medium text-center text-sm text-muted-foreground sticky top-0 z-10">
                        Time
                    </div>
                    {restaurantHalls.map(hall => (
                        <div key={hall.id} className="p-2 border-b border-r font-medium text-center bg-muted sticky top-0 z-10">
                            {hall.name}
                            <div className="text-xs text-muted-foreground">{hall.capacity}名</div>
                        </div>
                    ))}

                    {/* Time Rows */}
                    {hours.map(hour => (
                        <React.Fragment key={hour}>
                            {/* Time Label */}
                            <div className="border-b border-r p-2 text-xs text-muted-foreground text-center h-[60px] relative">
                                {hour}:00
                            </div>

                            {/* Slots */}
                            {restaurantHalls.map(hall => {
                                return (
                                    <div key={`${hall.id}-${hour}`} className="border-b border-r relative h-[60px]">
                                        {/* Check for reservations starting in this hour */}
                                        {dailyReservations.filter(r => r.hallId === hall.id).map(r => {
                                            const rStart = parseInt(r.startTime.split(':')[0])
                                            if (rStart === hour) {
                                                // Calculate height based on duration
                                                const rEnd = parseInt(r.endTime.split(':')[0])
                                                const durationHours = rEnd - rStart
                                                const height = durationHours * 60 - 4 // minus margin

                                                return (
                                                    <div
                                                        key={r.id}
                                                        className="absolute top-[2px] left-[2px] right-[2px] rounded bg-primary/10 border border-primary text-xs p-1 overflow-hidden cursor-pointer z-10 hover:bg-primary/20 transition-colors"
                                                        style={{ height: `${height}px` }}
                                                        onClick={() => setSelectedBookingId(r.id)}
                                                    >
                                                        <div className="font-bold">{customers.find(c => c.id === r.customerId)?.name} 様</div>
                                                        <div>{r.partySize}名</div>
                                                    </div>
                                                )
                                            }
                                            return null
                                        })}
                                    </div>
                                )
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <BookingDetailModal
                bookingId={selectedBookingId}
                open={!!selectedBookingId}
                onOpenChange={(open) => !open && setSelectedBookingId(null)}
                restaurantId={restaurantId}
            />
        </div>
    )
}
