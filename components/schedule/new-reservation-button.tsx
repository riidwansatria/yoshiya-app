"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BookingDetailModal } from "@/components/bookings/booking-detail-modal"
import { useTranslations } from "next-intl"

type StaffOption = { id: string; name: string; role: string }
type VenueOption = { id: string; name: string; capacity: number }

interface NewReservationButtonProps {
    restaurantId: string
    defaultDate?: string
    initialStaff?: StaffOption[]
    initialVenues?: VenueOption[]
}

export function NewReservationButton({
    restaurantId,
    defaultDate,
    initialStaff = [],
    initialVenues = [],
}: NewReservationButtonProps) {
    const t = useTranslations('bookingModal')
    const [open, setOpen] = React.useState(false)
    const [modalDefaultDate, setModalDefaultDate] = React.useState<string | undefined>(defaultDate)

    const handleOpen = React.useCallback(() => {
        const params = new URLSearchParams(window.location.search)
        const dateFromUrl = params.get('date') || defaultDate
        setModalDefaultDate(dateFromUrl || undefined)
        setOpen(true)
    }, [defaultDate])

    return (
        <>
            <Button size="sm" onClick={handleOpen}>
                <Plus className="mr-2 h-4 w-4" />
                {t('newTitle')}
            </Button>
            <BookingDetailModal
                bookingId={null}
                open={open}
                onOpenChange={setOpen}
                restaurantId={restaurantId}
                defaultDate={modalDefaultDate}
                initialStaff={initialStaff}
                initialVenues={initialVenues}
            />
        </>
    )
}
