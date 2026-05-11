import { format } from "date-fns"
import { getTranslations } from "next-intl/server"

import { Page, PageContent, PageHeader, PageHeaderHeading, PageTitle } from "@/components/layout/page"
import { PurchaseOrdersList } from "@/components/kitchen/purchase-order/purchase-orders-list"
import { getPurchaseOrders } from "@/lib/queries/purchase-orders"
import { getVendors } from "@/lib/queries/vendors"

export default async function PurchaseOrdersPage({
    params,
}: {
    params: Promise<{ restaurant: string }>
}) {
    const { restaurant } = await params
    const t = await getTranslations("kitchen.purchaseOrders")
    const [orders, vendors] = await Promise.all([
        getPurchaseOrders(),
        getVendors(),
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
                    vendors={vendors}
                    today={format(new Date(), "yyyy-MM-dd")}
                />
            </PageContent>
        </Page>
    )
}
