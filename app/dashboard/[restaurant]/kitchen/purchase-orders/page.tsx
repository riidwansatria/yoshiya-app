import { format } from "date-fns"
import { getTranslations } from "next-intl/server"

import { Page, PageContent, PageHeader, PageHeaderHeading, PageTitle } from "@/components/layout/page"
import { PurchaseOrdersList } from "@/components/kitchen/purchase-order/purchase-orders-list"
import { getDistinctStores } from "@/lib/queries/ingredients"
import { getPurchaseOrders } from "@/lib/queries/purchase-orders"

export default async function PurchaseOrdersPage({
    params,
}: {
    params: Promise<{ restaurant: string }>
}) {
    const { restaurant } = await params
    const t = await getTranslations("kitchen.purchaseOrders")
    const [orders, stores] = await Promise.all([
        getPurchaseOrders(),
        getDistinctStores(),
    ])

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t("title")}</PageTitle>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <PurchaseOrdersList
                    restaurantId={restaurant}
                    orders={orders}
                    stores={stores}
                    today={format(new Date(), "yyyy-MM-dd")}
                />
            </PageContent>
        </Page>
    )
}
