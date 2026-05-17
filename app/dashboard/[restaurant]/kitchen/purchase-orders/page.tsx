import { getTranslations } from "next-intl/server"

import { Page, PageActions, PageContent, PageHeader, PageHeaderHeading, PageTitle } from "@/components/layout/page"
import { PurchaseOrdersList } from "@/components/kitchen/purchase-order/purchase-orders-list"
import { PurchaseOrderPageActions } from "@/components/kitchen/purchase-order/purchase-order-page-actions"
import { getPurchaseOrders } from "@/lib/queries/purchase-orders"
import { requirePagePermission } from "@/lib/auth/server"

export default async function PurchaseOrdersPage({
    params,
}: {
    params: Promise<{ restaurant: string }>
}) {
    const { restaurant } = await params
    await requirePagePermission("procurement", "procurement.read")
    const t = await getTranslations("kitchen.purchaseOrders")
    const orders = await getPurchaseOrders()

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t("title")}</PageTitle>
                </PageHeaderHeading>
                <PageActions>
                    <PurchaseOrderPageActions restaurantId={restaurant} />
                </PageActions>
            </PageHeader>
            <PageContent>
                <PurchaseOrdersList
                    restaurantId={restaurant}
                    orders={orders}
                />
            </PageContent>
        </Page>
    )
}
