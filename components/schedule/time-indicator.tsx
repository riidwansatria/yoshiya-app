"use client"

import * as React from "react"
import { format, isSameDay } from "date-fns"
import { cn } from "@/lib/utils"

interface TimeIndicatorProps {
    date: Date // The currently viewed date
    startHour: number
    endHour: number
    hourHeight: number
    headerHeight: number // Not strictly needed if we position absolute to grid
    gridTemplateColumns: string // To match the grid layout
    // Helper to know if we should show it (usually if date === today)
}

export function TimeIndicator({
    date,
    startHour,
    endHour,
    hourHeight,
    headerHeight,
}: TimeIndicatorProps) {
    const [currentTime, setCurrentTime] = React.useState<Date | null>(null)

    React.useEffect(() => {
        setCurrentTime(new Date())
        const interval = setInterval(() => {
            setCurrentTime(new Date())
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    if (!currentTime) return null

    // Only show if the viewed date is Today
    const isToday = isSameDay(date, currentTime)
    if (!isToday) return null

    const currentHour = currentTime.getHours()
    if (currentHour < startHour || currentHour >= endHour) return null

    // Calculate position
    const hoursFromStart = (currentHour - startHour) + (currentTime.getMinutes() / 60)

    // CORRECTION: Set offset to 0. Using headerHeight + pure calculation provides accurate positioning.
    const CORRECTED_OFFSET = 0;
    const topPosition = headerHeight + (hoursFromStart * hourHeight) + CORRECTED_OFFSET

    const formattedTime = format(currentTime, "h:mma").toUpperCase()

    return (
        <div
            className="pointer-events-none absolute left-0 right-0 flex items-center"
            style={{
                top: `${topPosition}px`,
                zIndex: 30
            }}
        >
            <div className="flex items-center -translate-y-1/2 w-full">
                {/* Time Badge (in the time axis column - first 80px) */}
                <div className="w-[80px] flex justify-end pr-2 shrink-0">
                    <span className="bg-[#f04842] text-primary-foreground rounded-sm px-1.25 py-1 text-xs font-medium leading-none">
                        {formattedTime}
                    </span>
                </div>

                {/* Line across the rest of the grid */}
                <div className="flex-1 h-[2px] bg-[#f04842] shadow-[0_0_0_1px_white]" />
            </div>
        </div>
    )
}
