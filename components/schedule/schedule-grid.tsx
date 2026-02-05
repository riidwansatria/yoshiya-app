
"use client"

import * as React from "react"
import { format, addDays, subDays } from "date-fns"
import { ja } from "date-fns/locale"

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { halls, reservations, customers, staff } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { BookingDetailModal } from "@/components/bookings/booking-detail-modal"

import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { TimeIndicator } from "./time-indicator"
import { Separator } from "@/components/ui/separator"

interface ScheduleGridProps {
    restaurantId: string
}

export function ScheduleGrid({ restaurantId }: ScheduleGridProps) {
    // Use actual system date
    const [date, setDate] = React.useState<Date>(new Date())

    const restaurantHalls = halls.filter(h => h.restaurant === restaurantId)

    // Time range: 00:00 to 24:00 (Full Day)
    const startHour = 0
    const endHour = 24
    const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
    const hourHeight = 120
    const headerHeight = 30

    const scrollContainerRef = React.useRef<HTMLDivElement>(null)

    // Scroll to 10 AM on initial load
    React.useEffect(() => {
        if (scrollContainerRef.current) {
            // 10 AM position = 10 * hourHeight
            scrollContainerRef.current.scrollTop = 9.5 * hourHeight
        }
    }, [])

    // Filter reservations for this day and restaurant
    const dailyReservations = reservations.filter(r =>
        r.restaurant === restaurantId &&
        r.date === format(date, 'yyyy-MM-dd')
    )

    const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null)

    const handlePrevDay = () => setDate(d => subDays(d, 1))
    const handleNextDay = () => setDate(d => addDays(d, 1))
    const handleToday = () => {
        setDate(new Date())
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 10.5 * hourHeight
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Header / Date Navigator */}
            <div className="flex items-center justify-between bg-white p-2 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" onClick={handlePrevDay} className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="font-bold text-lg h-8 px-2 hover:bg-muted">
                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                    <span className="text-left w-24">
                                        {format(date, 'yyyy/MM/dd', { locale: ja })}
                                    </span>
                                    <span className="text-right">
                                        {format(date, '(E)', { locale: ja })}
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center">
                                <Calendar
                                    mode="single"
                                    captionLayout="dropdown"
                                    selected={date}
                                    onSelect={(d) => d && setDate(d)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="icon" onClick={handleNextDay} className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleToday}>
                        Today
                    </Button>
                </div>
                <div>
                    <Button variant="secondary" size="sm" className="bg-slate-100 hover:bg-slate-200 text-slate-700">Day View</Button>
                </div>
            </div>

            {/* Separator */}
            <Separator />

            {/* Grid Container */}
            <div
                ref={scrollContainerRef}
                className="overflow-auto flex-1 bg-white relative min-h-0 no-scrollbar"
            >
                <div className="min-w-[800px] relative">

                    {/* LAYER 1: Background Grid (Lines & Headers) */}
                    <div className="grid" style={{
                        gridTemplateColumns: `80px repeat(${restaurantHalls.length}, 1fr)`
                    }}>


                        {/* Corner (GMT+9) - Sticky Top-Left */}
                        <div
                            className="px-2 border-b border-r bg-gray-50/95 backdrop-blur font-medium text-center text-xs text-muted-foreground sticky top-0 left-0 z-50 flex items-center justify-center"
                            style={{ height: headerHeight }}
                        >
                            GMT+9
                        </div>
                        {/* Hall Headers - Sticky Top */}
                        {restaurantHalls.map(hall => (
                            <div
                                key={hall.id}
                                className="px-2 border-b border-r font-medium text-center bg-gray-50/95 backdrop-blur sticky top-0 z-40 min-w-[150px] overflow-hidden whitespace-nowrap flex flex-col justify-center"
                                style={{ height: headerHeight }}
                            >
                                <div className="text-sm font-semibold text-gray-700 truncate" title={hall.name}>{hall.name}</div>
                            </div>
                        ))}

                        {/* Grid Body */}
                        {hours.map(hour => {
                            // Format: 12 AM, 1 PM, etc.
                            const date = new Date()
                            date.setHours(hour, 0)
                            const label = format(date, "h a")

                            return (
                                <React.Fragment key={hour}>
                                    {/* Time Label - Sticky Left */}
                                    <div className="border-r border-gray-100 p-2 text-xs font-medium text-muted-foreground text-right sticky left-0 bg-gray-50/95 z-30" style={{ height: hourHeight }}>
                                        {hour > 0 && (
                                            <span className="block -mt-4 mr-1">{label}</span>
                                        )}
                                    </div>
                                    {/* Empty Hall Slots */}
                                    {restaurantHalls.map(hall => (
                                        <div key={`${hall.id}-${hour}`} className="border-b border-r border-gray-100 transition-colors hover:bg-gray-50/20" style={{ height: hourHeight }} />
                                    ))}
                                </React.Fragment>
                            )
                        })}
                    </div>

                    {/* LAYER 2: Events Overlay */}
                    <div
                        className="absolute inset-x-0 bottom-0 pointer-events-none grid"
                        style={{
                            gridTemplateColumns: `80px repeat(${restaurantHalls.length}, 1fr)`,
                            top: `${headerHeight}px`
                        }}
                    >
                        {/* Time Column Placeholder (Empty) */}
                        <div />

                        {/* Hall Event Columns */}
                        {restaurantHalls.map(hall => {
                            const hallBookings = dailyReservations.filter(r => r.hallId === hall.id)
                            return (
                                <div key={`events-${hall.id}`} className="relative h-full w-full pointer-events-auto min-w-[150px]">
                                    {hallBookings.map(r => {
                                        const rStart = parseInt(r.startTime.split(':')[0])
                                        const startMin = parseInt(r.startTime.split(':')[1] || '0')
                                        const rEndHour = parseInt(r.endTime.split(':')[0])
                                        const rEndMin = parseInt(r.endTime.split(':')[1] || '0')

                                        // Calculate Top & Height
                                        // Start time in minutes from grid start (11:00)
                                        const startTotalMinutes = (rStart * 60 + startMin) - (startHour * 60)
                                        const durationMinutes = ((rEndHour * 60) + rEndMin) - (rStart * 60 + startMin)

                                        const pixelsPerMinute = hourHeight / 60
                                        const top = startTotalMinutes * pixelsPerMinute
                                        const height = durationMinutes * pixelsPerMinute

                                        const statusConfig = r.status === 'confirmed' ? { bg: 'bg-blue-50', text: 'text-blue-700', accent: 'bg-blue-500' } :
                                            r.status === 'deposit_paid' ? { bg: 'bg-green-50', text: 'text-green-700', accent: 'bg-green-500' } :
                                                { bg: 'bg-gray-50', text: 'text-gray-700', accent: 'bg-gray-500' }

                                        // Prep and Cleaning blocks
                                        const prepDuration = 'prepDuration' in r ? (r.prepDuration as number) : 0
                                        const cleaningDuration = 'cleaningDuration' in r ? (r.cleaningDuration as number) : 0
                                        const prepStaffIds = 'prepStaffIds' in r ? (r.prepStaffIds as string[]) : []
                                        const cleaningStaffIds = 'cleaningStaffIds' in r ? (r.cleaningStaffIds as string[]) : []
                                        const serviceStaffIds = 'serviceStaffIds' in r ? (r.serviceStaffIds as string[]) : []

                                        const prepHeight = prepDuration * pixelsPerMinute
                                        const cleaningHeight = cleaningDuration * pixelsPerMinute
                                        const prepTop = top - prepHeight
                                        const cleaningTop = top + height

                                        const prepStaffNames = prepStaffIds.map(id => staff.find(s => s.id === id)?.name).filter(Boolean).join(' / ')
                                        const cleaningStaffNames = cleaningStaffIds.map(id => staff.find(s => s.id === id)?.name).filter(Boolean).join(' / ')
                                        const serviceStaffNames = serviceStaffIds.map(id => staff.find(s => s.id === id)?.name).filter(Boolean).join(' / ')

                                        return (
                                            <div key={r.id} className="group cursor-pointer" onClick={() => setSelectedBookingId(r.id)}>
                                                {/* Prep Block */}
                                                {prepDuration > 0 && (
                                                    <div
                                                        className={cn(
                                                            "absolute left-1 right-1 rounded-t-md text-[10px] pl-3 pr-1 py-1 overflow-hidden z-5 flex items-end transition-all group-hover:brightness-95",
                                                            statusConfig.bg,
                                                            statusConfig.text
                                                        )}
                                                        style={{
                                                            height: `${Math.max(prepHeight - 4, 16)}px`,
                                                            top: `${prepTop + 4}px`,
                                                        }}
                                                    >
                                                        {/* Striped Accent Bar */}
                                                        <div
                                                            className="absolute left-0 top-0 bottom-0 w-1"
                                                            style={{
                                                                background: `repeating-linear-gradient(180deg, ${r.status === 'confirmed' ? '#3b82f6' : r.status === 'deposit_paid' ? '#22c55e' : '#6b7280'}, ${r.status === 'confirmed' ? '#3b82f6' : r.status === 'deposit_paid' ? '#22c55e' : '#6b7280'} 3px, ${r.status === 'confirmed' ? '#93c5fd' : r.status === 'deposit_paid' ? '#86efac' : '#d1d5db'} 3px, ${r.status === 'confirmed' ? '#93c5fd' : r.status === 'deposit_paid' ? '#86efac' : '#d1d5db'} 6px)`,
                                                            }}
                                                        />
                                                        <span className="opacity-70">準備:</span>
                                                        <span className="font-medium truncate">{prepStaffNames}</span>
                                                    </div>
                                                )}

                                                {/* Main Event Block */}
                                                <div
                                                    className={cn(
                                                        "absolute left-1 right-1 text-[10px] pl-3 pr-1 py-2 overflow-hidden z-10 transition-all group-hover:brightness-95 flex flex-col justify-between leading-tight ring-1 ring-background",
                                                        prepDuration > 0 ? "rounded-none" : "rounded-t-md",
                                                        cleaningDuration > 0 ? "rounded-none" : "rounded-b-md",
                                                        statusConfig.bg,
                                                        statusConfig.text
                                                    )}
                                                    style={{
                                                        height: `${Math.max(height - 8, 20)}px`,
                                                        top: `${top + 4}px`
                                                    }}
                                                >
                                                    {/* Accent Bar - Pure Vertical Inner Edge */}
                                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", statusConfig.accent)} />

                                                    {/* Top content */}
                                                    <div>
                                                        <div className="font-medium truncate">{r.groupName}</div>
                                                        {height > 30 && (
                                                            <div className="flex gap-1 opacity-80 mt-0.5 items-center">
                                                                <span>{r.startTime}</span>
                                                                <span>•</span>
                                                                <span>{r.partySize}名</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Bottom content - Service Staff */}
                                                    {height > 50 && serviceStaffNames && (
                                                        <div className="opacity-70 truncate">
                                                            <span>担当: </span>
                                                            <span className="font-medium">{serviceStaffNames}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Cleaning Block */}
                                                {cleaningDuration > 0 && (
                                                    <div
                                                        className={cn(
                                                            "absolute left-1 right-1 rounded-b-md text-[10px] pl-3 pr-1 py-1 overflow-hidden z-5 flex items-start transition-all group-hover:brightness-95",
                                                            statusConfig.bg,
                                                            statusConfig.text
                                                        )}
                                                        style={{
                                                            height: `${Math.max(cleaningHeight - 4, 16)}px`,
                                                            top: `${cleaningTop}px`,
                                                        }}
                                                    >
                                                        {/* Striped Accent Bar */}
                                                        <div
                                                            className="absolute left-0 top-0 bottom-0 w-1"
                                                            style={{
                                                                background: `repeating-linear-gradient(180deg, ${r.status === 'confirmed' ? '#3b82f6' : r.status === 'deposit_paid' ? '#22c55e' : '#6b7280'}, ${r.status === 'confirmed' ? '#3b82f6' : r.status === 'deposit_paid' ? '#22c55e' : '#6b7280'} 3px, ${r.status === 'confirmed' ? '#93c5fd' : r.status === 'deposit_paid' ? '#86efac' : '#d1d5db'} 3px, ${r.status === 'confirmed' ? '#93c5fd' : r.status === 'deposit_paid' ? '#86efac' : '#d1d5db'} 6px)`,
                                                            }}
                                                        />
                                                        <span className="opacity-70">片付け:</span>
                                                        <span className="font-medium truncate">{cleaningStaffNames}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>

                    {/* LAYER 3: Time Indicator */}
                    <TimeIndicator
                        date={date}
                        startHour={startHour}
                        endHour={endHour}
                        hourHeight={hourHeight}
                        headerHeight={headerHeight}
                        gridTemplateColumns={`80px repeat(${restaurantHalls.length}, 1fr)`}
                    />
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
