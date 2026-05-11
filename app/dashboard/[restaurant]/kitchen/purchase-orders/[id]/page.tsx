import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { Page, PageContent, PageHeader, PageHeaderHeading, PageTitle } from "@/components/layout/page"
import { PurchaseOrderForm } from "@/components/kitchen/purchase-order/purchase-order-form"
import { getIngredients } from "@/lib/queries/ingredients"
import { getPurchaseOrderById } from "@/lib/queries/purchase-orders"
import { getIngredientsSummary } from "@/lib/queries/ingredients-summary"
import { getVendors } from "@/lib/queries/vendors"
import type { AggregatedIngredient } from "@/lib/queries/ingredients-summary"

export default async function PurchaseOrderDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>
}) {
    const { restaurant, id } = await params
    const t = await getTranslations("kitchen.purchaseOrders")
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
        summaryReference = Object.values(grouped)
            .flat()
            .filter((i) => i.vendor_id === order.vendor_id)
    }

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t("detailTitle")}</PageTitle>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <PurchaseOrderForm
                    restaurantId={restaurant}
                    order={order}
                    ingredients={ingredients}
                    vendors={vendors}
                    summaryReference={summaryReference}
                    sourceDateFrom={order.source_date_from}
                    sourceDateTo={order.source_date_to}
                />
            </PageContent>
        </Page>
    )
}
