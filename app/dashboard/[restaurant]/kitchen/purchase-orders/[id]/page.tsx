import { notFound } from "next/navigation"

import { PurchaseOrderForm } from "@/components/kitchen/purchase-order/purchase-order-form"
import { getIngredients } from "@/lib/queries/ingredients"
import { getPurchaseOrderById } from "@/lib/queries/purchase-orders"
import { getIngredientsSummary } from "@/lib/queries/ingredients-summary"
import { getVendors } from "@/lib/queries/vendors"
import type { AggregatedIngredient } from "@/lib/queries/ingredients-summary"
import { requirePagePermission } from "@/lib/auth/server"

export default async function PurchaseOrderDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>
}) {
    const { restaurant, id } = await params
    await requirePagePermission("procurement", id === "new" ? "procurement.create" : "procurement.read")
    const [order, ingredients, vendors] = await Promise.all([
        getPurchaseOrderById(id),
        getIngredients(),
        getVendors(),
    ])

    if (!order) {
        notFound()
    }

    let summaryReference: AggregatedIngredient[] = []
    if (
        order.source_type === "summary" &&
        order.source_date_from &&
        order.source_date_to
    ) {
        const grouped = await getIngredientsSummary(
            restaurant,
            order.source_date_from,
            order.source_date_to
        )
        summaryReference = Object.values(grouped).flat()
    }

    return (
        <PurchaseOrderForm
            restaurantId={restaurant}
            order={order}
            ingredients={ingredients}
            vendors={vendors}
            summaryReference={summaryReference}
            sourceDateFrom={order.source_date_from}
            sourceDateTo={order.source_date_to}
        />
    )
}
