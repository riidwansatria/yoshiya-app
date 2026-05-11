"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Plus } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"

import {
    createBlankPurchaseOrder,
    deletePurchaseOrder,
} from "@/lib/actions/purchase-orders"
import type { PurchaseOrderListItem } from "@/lib/queries/purchase-orders"
import type { Vendor } from "@/lib/queries/vendors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface PurchaseOrdersListProps {
    restaurantId: string
    orders: PurchaseOrderListItem[]
    vendors: Vendor[]
    today: string
}

function formatDate(value: string) {
    return value.slice(0, 10)
}

export function PurchaseOrdersList({
    restaurantId,
    orders,
    vendors,
    today,
}: PurchaseOrdersListProps) {
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations("kitchen.purchaseOrders")
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
    const [orderDate, setOrderDate] = useState(today)
    const [isPending, startTransition] = useTransition()

    const createBlank = () => {
        startTransition(async () => {
            const result = await createBlankPurchaseOrder(restaurantId, selectedVendor?.name ?? "", orderDate, selectedVendor?.id ?? null)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(t("createSuccess"))
            router.push(`/dashboard/${restaurantId}/kitchen/purchase-orders/${result.id}`)
        })
    }

    const removeOrder = (id: string) => {
        startTransition(async () => {
            const result = await deletePurchaseOrder(restaurantId, id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(t("deleteSuccess"))
            router.refresh()
        })
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                    <label htmlFor="purchase-order-vendor" className="text-sm font-medium">
                        {t("vendorLabel")}
                    </label>
                    <Combobox
                        value={selectedVendor}
                        onValueChange={setSelectedVendor}
                        items={vendors}
                        itemToStringLabel={(v) => v.name}
                        autoHighlight
                    >
                        <ComboboxInput placeholder={t("vendorPlaceholder")} showClear={!!selectedVendor} />
                        <ComboboxContent>
                            <ComboboxEmpty>{t("vendorEmpty")}</ComboboxEmpty>
                            <ComboboxList>
                                {(vendor) => (
                                    <ComboboxItem key={vendor.id} value={vendor}>
                                        {vendor.name}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="purchase-order-date" className="text-sm font-medium">
                        {t("orderDate")}
                    </label>
                    <Input
                        id="purchase-order-date"
                        type="date"
                        value={orderDate}
                        onChange={(event) => setOrderDate(event.target.value)}
                    />
                </div>
                <Button
                    type="button"
                    onClick={createBlank}
                    disabled={isPending || !selectedVendor || !orderDate}
                >
                    <Plus />
                    {t("newBlank")}
                </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("supplierColumn")}</TableHead>
                            <TableHead>{t("orderDate")}</TableHead>
                            <TableHead>{t("status")}</TableHead>
                            <TableHead className="text-right">{t("lineCount")}</TableHead>
                            <TableHead>{t("updatedAt")}</TableHead>
                            <TableHead className="w-[70px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">
                                    <Link
                                        href={`/dashboard/${restaurantId}/kitchen/purchase-orders/${order.id}`}
                                        className="hover:underline"
                                    >
                                        {order.supplier_name}
                                    </Link>
                                </TableCell>
                                <TableCell>{formatDate(order.order_date)}</TableCell>
                                <TableCell>
                                    <Badge variant={order.status === "done" ? "default" : "secondary"}>
                                        {order.status === "done" ? t("statusDone") : t("statusDraft")}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {order.line_count}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {formatDate(order.updated_at)}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal />
                                                <span className="sr-only">{t("openMenu")}</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/dashboard/${restaurantId}/kitchen/purchase-orders/${order.id}`}>
                                                    {t("editAction")}
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/print/${restaurantId}/kitchen/purchase-orders/${order.id}?locale=${locale}`} target="_blank">
                                                    {t("printAction")}
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => removeOrder(order.id)}
                                            >
                                                {t("deleteAction")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {t("emptyState")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
