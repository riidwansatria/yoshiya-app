import { NextRequest, NextResponse } from "next/server"

import { generatePurchaseOrderPdf } from "@/lib/pdf/purchase-order-pdf"
import { getPurchaseOrderById, getPurchaseOrderSettings } from "@/lib/queries/purchase-orders"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const restaurantId = req.nextUrl.searchParams.get("restaurant")

    if (!restaurantId) {
        return NextResponse.json({ error: "Missing restaurant" }, { status: 400 })
    }

    const [order, settings] = await Promise.all([
        getPurchaseOrderById(id),
        getPurchaseOrderSettings(restaurantId),
    ])

    if (!order) {
        return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    const pdf = await generatePurchaseOrderPdf(order, settings)

    return new NextResponse(pdf.buffer as ArrayBuffer, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${order.document_no}.pdf"`,
        },
    })
}
