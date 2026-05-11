import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { Page, PageContent, PageHeader, PageHeaderHeading, PageTitle } from "@/components/layout/page"
import { PurchaseOrderForm } from "@/components/kitchen/purchase-order/purchase-order-form"
import { getIngredients } from "@/lib/queries/ingredients"
import { getPurchaseOrderById } from "@/lib/queries/purchase-orders"
import { getVendors } from "@/lib/queries/vendors"

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
                />
            </PageContent>
        </Page>
    )
}
