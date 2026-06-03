import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { PurchaseOrderForm } from "@/components/kitchen/purchase-order/purchase-order-form"
import { Page, PageActions, PageContent, PageHeader, PageHeaderHeading, PageTitle } from "@/components/layout/page"
import { getIngredients } from "@/lib/queries/ingredients"
import { getPurchaseOrderById } from "@/lib/queries/purchase-orders"
import { getIngredientsSummary } from "@/lib/queries/ingredients-summary"
import { getVendors } from "@/lib/queries/vendors"
import type { AggregatedIngredient } from "@/lib/queries/ingredients-summary"
import { requirePagePermission } from "@/lib/auth/server"
import { RestaurantContextSelect } from "@/components/layout/restaurant-context-select"
import { getRestaurants } from "@/lib/queries/restaurants"
import { resolveRestaurantContext } from "@/lib/utils/restaurant-context"

export default async function PurchaseOrderDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ restaurant?: string | string[] }>
}) {
    const { id } = await params
    await requirePagePermission("procurement", id === "new" ? "procurement.create" : "procurement.read")
    const [order, ingredients, vendors, t, resolvedSearchParams, restaurants] = await Promise.all([
        getPurchaseOrderById(id),
        getIngredients(),
        getVendors(),
        getTranslations("kitchen.purchaseOrders"),
        searchParams,
        getRestaurants(),
    ])
    const selectedRestaurant = resolveRestaurantContext(restaurants, resolvedSearchParams.restaurant)
    const settingsRestaurantId = selectedRestaurant?.id ?? "kitchen"

    if (!order) {
        notFound()
    }

    let summaryReference: AggregatedIngredient[] = []
    if (
        order.source_type === "summary" &&
        order.source_date_from &&
        order.source_date_to &&
        selectedRestaurant
    ) {
        const grouped = await getIngredientsSummary(
            selectedRestaurant.id,
            order.source_date_from,
            order.source_date_to
        )
        summaryReference = Object.values(grouped).flat()
    }

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t("detailTitle")}</PageTitle>
                </PageHeaderHeading>
                <PageActions>
                    <RestaurantContextSelect
                        restaurants={restaurants}
                        selectedRestaurantId={selectedRestaurant?.id ?? null}
                    />
                    <div id="purchase-order-actions-slot" />
                </PageActions>
            </PageHeader>
            <PageContent className="flex flex-col gap-4 overflow-hidden">
                <PurchaseOrderForm
                    restaurantId={settingsRestaurantId}
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
