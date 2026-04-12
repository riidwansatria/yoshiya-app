"use client"

import * as React from "react"
import { format, addDays, subDays, startOfDay } from "date-fns"
import { ja } from "date-fns/locale"

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BookingDetailModal } from "@/components/bookings/booking-detail-modal"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { fetchScheduleReservations } from "@/lib/actions/schedule"

interface ScheduleGridTransposedProps {
    restaurantId: string
    dateStr: string
    initialVenues: any[]
    initialReservations: any[]
    initialStaff: { id: string; name: string; role: string }[]
}

const HOUR_WIDTH = 200
const ROOM_LABEL_WIDTH = 160
const OFF_HOUR_WIDTH = 100
const HEADER_HEIGHT = 30
const ROOM_ROW_HEIGHT = 56
const DISPLAY_START_HOUR = 10 // 10 AM
const DISPLAY_END_HOUR = 20  // 8 PM

export function ScheduleGridTransposed({
    restaurantId,
    dateStr,
    initialVenues,
    initialReservations,
    initialStaff,
}: ScheduleGridTransposedProps) {
    const [currentDateStr, setCurrentDateStr] = React.useState(dateStr)
    const date = new Date(currentDateStr + 'T00:00:00')

    const cacheRef = React.useRef<Map<string, any[]>>(new Map([[dateStr, initialReservations]]))

    const restaurantHalls = initialVenues

    const startHour = 0
    const endHour = 24
    
    // Hours to display (10 AM - 8 PM)
    const displayHours = Array.from({ length: DISPLAY_END_HOUR - DISPLAY_START_HOUR }, (_, i) => DISPLAY_START_HOUR + i)

    const scrollContainerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = 0
        }
    }, [])

    const [reservations, setReservations] = React.useState(initialReservations)
    const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null)
    const [showStaffDetails, setShowStaffDetails] = React.useState(true)

    React.useEffect(() => {
        cacheRef.current.set(dateStr, initialReservations)
        if (dateStr === currentDateStr) setReservations(initialReservations)
    }, [dateStr, initialReservations, currentDateStr])

    React.useEffect(() => {
        const prefetch = async (offset: number) => {
            const adjacent = format(addDays(date, offset), 'yyyy-MM-dd')
            if (cacheRef.current.has(adjacent)) return
            const data = await fetchScheduleReservations(restaurantId, adjacent)
            if (data) cacheRef.current.set(adjacent, data)
        }
        for (const offset of [-3, -2, -1, 1, 2, 3]) prefetch(offset)
    }, [currentDateStr, restaurantId])

    React.useEffect(() => {
        const onPopState = () => {
            const params = new URLSearchParams(window.location.search)
            const d = params.get('date') || format(new Date(), 'yyyy-MM-dd')
            const cached = cacheRef.current.get(d)
            setCurrentDateStr(d)
            if (cached) {
                setReservations(cached)
            } else {
                fetchScheduleReservations(restaurantId, d).then(data => {
                    if (data) { cacheRef.current.set(d, data); setReservations(data) }
                })
            }
        }
        window.addEventListener('popstate', onPopState)
        return () => window.removeEventListener('popstate', onPopState)
    }, [restaurantId])

    const handleBookingDeleted = React.useCallback((bookingId: string) => {
        setReservations(prev => {
            const next = prev.filter(r => r.id !== bookingId)
            cacheRef.current.set(currentDateStr, next)
            return next
        })
        setSelectedBookingId(prev => (prev === bookingId ? null : prev))
    }, [currentDateStr])

    const handleDateChange = (newDate: Date | undefined) => {
        if (!newDate) return
        const formatted = format(newDate, 'yyyy-MM-dd')
        const cached = cacheRef.current.get(formatted)
        setCurrentDateStr(formatted)
        if (cached) {
            setReservations(cached)
        } else {
            setReservations([])
            fetchScheduleReservations(restaurantId, formatted).then(data => {
                if (data) { cacheRef.current.set(formatted, data); setReservations(data) }
            })
        }
        window.history.pushState({}, '', `/dashboard/${restaurantId}/schedule?date=${formatted}`)
    }

    const dailyReservations = reservations

    // Check for bookings outside display hours or with no time
    const offHourBookings = dailyReservations.filter(r => {
        if (!r.start_time) return true
        const hour = parseInt(r.start_time.split(':')[0])
        return hour < DISPLAY_START_HOUR || hour >= DISPLAY_END_HOUR
    })
    const hasOffHourBookings = offHourBookings.length > 0

    const handlePrevDay = () => handleDateChange(subDays(date, 1))
    const handleNextDay = () => handleDateChange(addDays(date, 1))
    const handleToday = () => {
        handleDateChange(new Date())
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = 10 * HOUR_WIDTH
        }
    }

    const today = startOfDay(new Date())
    const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Calculate position relative to display hours (10 AM = 0)
    let todayPosition = -1
    if (currentHour >= DISPLAY_START_HOUR && currentHour < DISPLAY_END_HOUR) {
        todayPosition = ((currentHour - DISPLAY_START_HOUR) * 60 + currentMinute) / 60 * HOUR_WIDTH
    }
    const totalHeight = HEADER_HEIGHT + (restaurantHalls.length * ROOM_ROW_HEIGHT)

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header / Date Navigator */}
            <div className="flex items-center justify-between bg-white px-3 py-2 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={handlePrevDay} className="w-7">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="font-semibold text-lg tracking-tight h-8 px-2 hover:bg-muted">
                                    <CalendarIcon className="h-5 w-5 opacity-50" />
                                    <span className="text-left w-26 mt-0.5">
                                        {format(date, 'yyyy/MM/dd', { locale: ja })}
                                    </span>
                                    <span className="text-right mt-0.5">
                                        {format(date, '(E)', { locale: ja })}
                                    </span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="center">
                                <Calendar
                                    mode="single"
                                    captionLayout="dropdown"
                                    selected={date}
                                    onSelect={handleDateChange}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Button variant="outline" size="sm" onClick={handleNextDay} className="w-7">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleToday}>
                        本日
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={showStaffDetails ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setShowStaffDetails(!showStaffDetails)}
                        className={showStaffDetails ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : ""}
                    >
                        {showStaffDetails ? "担当表示中" : "担当非表示"}
                    </Button>
                </div>
            </div> 

            <Separator />

            <div
                ref={scrollContainerRef}
                className="overflow-auto flex-1 bg-background relative min-h-0"
            >
                <div className="inline-block min-w-max">
                    <div className="grid" style={{
                        gridTemplateColumns: `${ROOM_LABEL_WIDTH}px${hasOffHourBookings ? ` ${OFF_HOUR_WIDTH}px` : ''} repeat(${displayHours.length}, ${HOUR_WIDTH}px)`,
                        gridTemplateRows: `${HEADER_HEIGHT}px repeat(${restaurantHalls.length}, ${ROOM_ROW_HEIGHT}px)`
                    }}>
                        <div
                            className="flex flex-col justify-center px-3 py-2 pt-0.5 text-xs font-medium text-muted-foreground border-b border-r border-border bg-background sticky top-0 left-0 z-30"
                            style={{ gridColumn: 1, gridRow: 1 }}
                        >
                            <span>部屋</span>
                        </div>

                        {/* Off-hour column header - only shows when there are off-hour bookings */}
                        {hasOffHourBookings && (
                            <div
                                className="flex flex-col justify-center px-2 pt-0.5 text-xs text-muted-foreground font-medium border-b border-r border-border bg-background sticky top-0 z-10"
                                style={{ gridColumn: 2, gridRow: 1 }}
                            >
                                <span>他</span>
                            </div>
                        )}

                        {displayHours.map(hour => {
                            const d = new Date()
                            d.setHours(hour, 0)
                            return (
                                <div
                                    key={`header-${hour}`}
                                    className="flex flex-col justify-center px-2 pt-0.5 text-xs text-muted-foreground font-medium border-b border-r border-border bg-background sticky top-0 z-10"
                                    style={{ 
                                        gridColumn: hasOffHourBookings ? hour - DISPLAY_START_HOUR + 3 : hour - DISPLAY_START_HOUR + 2, 
                                        gridRow: 1 
                                    }}
                                >
                                    <span>{hour}:00</span>
                                </div>
                            )
                        })}

                        {restaurantHalls.map((hall, hallRow) => {
                            const isFirstRowOfVenue = hallRow === 0 || restaurantHalls[hallRow - 1]?.id !== hall.id
                            const isLastRowOfVenue = hallRow === restaurantHalls.length - 1 || restaurantHalls[hallRow + 1]?.id !== hall.id
                            const venueRows = restaurantHalls.filter(v => v.id === hall.id)
                            const hallBookings = dailyReservations.filter(r => r.venue_id === hall.id)
                            
                            // Get bookings for this slot
                            const bookingsForThisSlot = hallBookings.filter((_, idx) => 
                                idx % venueRows.length === hallRow
                            )
                            
                            // Get off-hour and display-hour bookings separately
                            const offHourSlotBookings = bookingsForThisSlot.filter(r => {
                                if (!r.start_time) return true
                                const hour = parseInt(r.start_time.split(':')[0])
                                return hour < DISPLAY_START_HOUR || hour >= DISPLAY_END_HOUR
                            })
                            const displayHourSlotBookings = bookingsForThisSlot.filter(r => {
                                if (!r.start_time) return false
                                const hour = parseInt(r.start_time.split(':')[0])
                                return hour >= DISPLAY_START_HOUR && hour < DISPLAY_END_HOUR
                            })
                            
                            return (
                            <React.Fragment key={`${hall.id}-${hallRow}`}>
                                <div
                                    className={cn(
                                        "flex flex-col justify-start px-3 py-2 text-xs text-foreground border-b border-r border-border bg-background sticky left-0 z-20",
                                        !isFirstRowOfVenue && "border-t-0",
                                        !isLastRowOfVenue && "border-b-0"
                                    )}
                                    style={{ 
                                        gridColumn: 1, 
                                        gridRow: hallRow + 2,
                                        top: 0
                                    }}
                                >
                                    {isFirstRowOfVenue && (
                                        <>
                                            <span className="truncate text-base font-medium" title={hall.name}>
                                                {hall.name}
                                            </span>
                                            <span className="truncate text-muted-foreground">
                                                {hall.capacity}名
                                            </span>
                                        </>
                                    )}
                                </div>
                                
                                {/* Off-hour column cell - only renders when there are off-hour bookings */}
                                {hasOffHourBookings && (
                                    <div 
                                        key={`${hall.id}-${hallRow}-offhour`}
                                        className={cn(
                                            "border-b border-r border-border/50 bg-muted/10 relative flex flex-col gap-0.5 p-0.5",
                                            !isFirstRowOfVenue && "border-t-0",
                                            !isLastRowOfVenue && "border-b-0"
                                        )}
                                        style={{ gridColumn: 2, gridRow: hallRow + 2 }}
                                    >
                                        {offHourSlotBookings.map(r => {
                                            const statusConfig = r.status === 'confirmed' ? 
                                                { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' } :
                                                r.status === 'deposit_paid' ? 
                                                { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' } :
                                                { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' }
                                            
                                            return (
                                                <div 
                                                    key={r.id}
                                                    className="cursor-pointer group"
                                                    onClick={() => setSelectedBookingId(r.id)}
                                                >
                                                    <div className={cn(
                                                        "rounded border text-[10px] px-1 py-0.5 flex flex-col overflow-hidden",
                                                        statusConfig.bg,
                                                        statusConfig.text,
                                                        statusConfig.border,
                                                        "group-hover:brightness-95 transition-all h-full"
                                                    )}>
                                                        <div className="font-medium truncate">{r.group_name}</div>
                                                        {r.start_time && (
                                                            <div className="text-[9px] opacity-70 truncate">{r.start_time?.substring(0,5)}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                                
                                {displayHours.map(hour => {
                                    const hourBookings = displayHourSlotBookings.filter(r => {
                                        if (!r.start_time) return false
                                        const h = parseInt(r.start_time.split(':')[0])
                                        return h === hour
                                    })
                                    return (
                                        <div 
                                            key={`${hall.id}-${hallRow}-${hour}`} 
                                            className="border-b border-r border-border/50"
                                            style={{ 
                                                gridColumn: hasOffHourBookings ? hour - DISPLAY_START_HOUR + 3 : hour - DISPLAY_START_HOUR + 2, 
                                                gridRow: hallRow + 2 
                                            }}
                                        />
                                    )
                                })}
                            </React.Fragment>
                        )})}
                    </div>

                    {isToday && todayPosition >= 0 && (
                        <div
                            className="absolute w-px z-10"
                            style={{
                                left: `${ROOM_LABEL_WIDTH + (hasOffHourBookings ? OFF_HOUR_WIDTH : 0) + todayPosition}px`,
                                top: 0,
                                height: `${totalHeight}px`,
                                backgroundColor: '#f04842',
                                boxShadow: '0 0 0 1px white'
                            }}
                        />
                    )}

                    {restaurantHalls.map((hall, hallRow) => {
                        const venueRows = restaurantHalls.filter(v => v.id === hall.id)
                        const hallBookings = dailyReservations.filter(r => r.venue_id === hall.id)
                        
                        const bookingsForThisSlot = hallBookings.filter((_, idx) => 
                            idx % venueRows.length === hallRow
                        )
                        
                        // Only display-hour bookings in the overlay
                        const displayHourBookings = bookingsForThisSlot.filter(r => {
                            if (!r.start_time) return false
                            const hour = parseInt(r.start_time.split(':')[0])
                            return hour >= DISPLAY_START_HOUR && hour < DISPLAY_END_HOUR
                        })
                        
                        // Calculate left offset accounting for off-hour column
                        const leftOffset = ROOM_LABEL_WIDTH + (hasOffHourBookings ? OFF_HOUR_WIDTH : 0)
                        const totalWidth = displayHours.length * HOUR_WIDTH
                        
                        return (
                            <div
                                key={`events-${hall.id}-${hallRow}`}
                                className="absolute pointer-events-auto"
                                style={{
                                    top: `${HEADER_HEIGHT + (hallRow * ROOM_ROW_HEIGHT)}px`,
                                    left: `${leftOffset}px`,
                                    height: `${ROOM_ROW_HEIGHT}px`,
                                    width: `${totalWidth}px`
                                }}
                            >
                                {displayHourBookings.map(r => {
                                    const rStart = parseInt(r.start_time!.split(':')[0])
                                    const startMin = parseInt(r.start_time!.split(':')[1] || '0')
                                    const rEndHour = parseInt(r.end_time!.split(':')[0])
                                    const rEndMin = parseInt(r.end_time!.split(':')[1] || '0')

                                    const startOffsetFrom10 = (rStart - DISPLAY_START_HOUR) * 60 + startMin
                                    const durationMinutes = ((rEndHour * 60) + rEndMin) - (rStart * 60 + startMin)

                                    const pixelsPerMinute = HOUR_WIDTH / 60
                                    const left = startOffsetFrom10 * pixelsPerMinute
                                    const width = durationMinutes * pixelsPerMinute

                                    const statusConfig = r.status === 'confirmed' ? 
                                        { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' } :
                                        r.status === 'deposit_paid' ? 
                                        { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' } :
                                        { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' }

                                    const serviceStaff = r.reservation_staff?.filter((s: any) => s.role === 'service') || []
                                    const serviceStaffNames = serviceStaff.map((s: any) => s.users?.name || s.temp_name).filter(Boolean).join(', ')

                                    return (
                                        <div 
                                            key={r.id} 
                                            className="absolute top-1 bottom-1 cursor-pointer group"
                                            style={{ left: `${left}px`, width: `${width}px` }}
                                            onClick={() => setSelectedBookingId(r.id)}
                                        >
                                            <div className={cn(
                                                "absolute inset-0 rounded border text-xs px-2 flex flex-col justify-center overflow-hidden",
                                                statusConfig.bg,
                                                statusConfig.text,
                                                statusConfig.border,
                                                "group-hover:brightness-95 transition-all"
                                            )}>
                                                <div className="font-medium truncate">{r.group_name}</div>
                                                {width > 60 && (
                                                    <div className="text-[10px] opacity-70 truncate">
                                                        {r.start_time?.substring(0,5)} • {r.party_size}名
                                                    </div>
                                                )}
                                                {showStaffDetails && width > 80 && serviceStaffNames && (
                                                    <div className="text-[10px] opacity-70 truncate">
                                                        担当: {serviceStaffNames}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            </div>

            <BookingDetailModal
                bookingId={selectedBookingId}
                open={!!selectedBookingId}
                onOpenChange={(open) => !open && setSelectedBookingId(null)}
                restaurantId={restaurantId}
                initialStaff={initialStaff}
                initialVenues={initialVenues}
                onDeleted={handleBookingDeleted}
            />
        </div>
    )
}