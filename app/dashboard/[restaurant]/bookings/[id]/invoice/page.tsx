import { InvoiceView } from "@/components/invoice/invoice-view"
import { getReservationById } from "@/lib/queries/reservations"
import { notFound } from "next/navigation"
import { requirePagePermission } from "@/lib/auth/server"

export default async function InvoicePage({ params }: { params: Promise<{ restaurant: string, id: string }> }) {
    const { restaurant, id } = await params
    await requirePagePermission("reservations", "reservations.read")
    
    const booking = await getReservationById(id)
    if (!booking) {
        notFound()
    }
    
    return <InvoiceView restaurantId={restaurant} bookingId={id} initialBooking={booking} />
}
