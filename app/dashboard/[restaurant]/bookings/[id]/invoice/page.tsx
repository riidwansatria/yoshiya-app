import { InvoiceView } from "@/components/invoice/invoice-view"

export default async function InvoicePage({ params }: { params: Promise<{ restaurant: string, id: string }> }) {
    const { restaurant, id } = await params
    return <InvoiceView restaurantId={restaurant} bookingId={id} />
}
