"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { createBlankPurchaseOrder } from "@/lib/actions/purchase-orders"
import { Button } from "@/components/ui/button"
import { buildDashboardPurchaseOrderDetailPath } from "@/lib/constants/routes"

interface PurchaseOrderPageActionsProps {
    restaurantId: string
}

function getLocalIsoDate() {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

export function PurchaseOrderPageActions({ restaurantId }: PurchaseOrderPageActionsProps) {
    const router = useRouter()
    const t = useTranslations("kitchen.purchaseOrders")
    const [isPending, startTransition] = useTransition()

    const createBlank = () => {
        startTransition(async () => {
            const result = await createBlankPurchaseOrder(
                restaurantId,
                t("unassignedSupplier"),
                getLocalIsoDate(),
                null
            )

            if (result.error) {
                toast.error(result.error)
                return
            }
            if (!result.id) {
                toast.error(t("createFailed"))
                return
            }

            toast.success(t("createSuccess"))
            router.push(buildDashboardPurchaseOrderDetailPath(result.id, restaurantId))
        })
    }

    return (
        <Button type="button" onClick={createBlank} disabled={isPending}>
            <Plus />
            {t("newBlank")}
        </Button>
    )
}
