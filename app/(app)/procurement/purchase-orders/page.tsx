import { getTranslations } from "next-intl/server"

import { Page, PageActions, PageContent, PageHeader, PageHeaderHeading, PageTitle } from "@/components/layout/page"
import { PurchaseOrdersList } from "@/components/kitchen/purchase-order/purchase-orders-list"
import { PurchaseOrderPageActions } from "@/components/kitchen/purchase-order/purchase-order-page-actions"
import { getPurchaseOrders } from "@/lib/queries/purchase-orders"
import { requirePagePermission } from "@/lib/auth/server"
import { RestaurantContextSelect } from "@/components/layout/restaurant-context-select"
import { getRestaurants } from "@/lib/queries/restaurants"
import { resolveRestaurantContext } from "@/lib/utils/restaurant-context"

export default async function PurchaseOrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ restaurant?: string | string[] }>
}) {
    await requirePagePermission("procurement", "procurement.read")
    const [t, resolvedSearchParams, restaurants, orders] = await Promise.all([
        getTranslations("kitchen.purchaseOrders"),
        searchParams,
        getRestaurants(),
        getPurchaseOrders(),
    ])
    const selectedRestaurant = resolveRestaurantContext(restaurants, resolvedSearchParams.restaurant)
    const settingsRestaurantId = selectedRestaurant?.id ?? "kitchen"

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t("title")}</PageTitle>
                </PageHeaderHeading>
                <PageActions>
                    <RestaurantContextSelect
                        restaurants={restaurants}
                        selectedRestaurantId={selectedRestaurant?.id ?? null}
                    />
                    <PurchaseOrderPageActions restaurantId={settingsRestaurantId} />
                </PageActions>
            </PageHeader>
            <PageContent>
                <PurchaseOrdersList
                    restaurantId={settingsRestaurantId}
                    orders={orders}
                />
            </PageContent>
        </Page>
    )
}
