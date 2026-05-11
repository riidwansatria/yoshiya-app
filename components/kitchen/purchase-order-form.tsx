"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Printer, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"

import {
    addIngredientToPurchaseOrder,
    deletePurchaseOrderLine,
    updatePurchaseOrderHeader,
    updatePurchaseOrderLines,
} from "@/lib/actions/purchase-orders"
import type {
    PurchaseOrderDetail,
    PurchaseOrderLine,
    PurchaseOrderStatus,
} from "@/lib/queries/purchase-orders"
import type { Ingredient } from "@/lib/queries/ingredients"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

interface PurchaseOrderFormProps {
    restaurantId: string
    order: PurchaseOrderDetail
    ingredients: Ingredient[]
}

function numberInputValue(value: number | null) {
    return value === null ? "" : String(value)
}

export function PurchaseOrderForm({
    restaurantId,
    order,
    ingredients,
}: PurchaseOrderFormProps) {
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations("kitchen.purchaseOrders")
    const [supplierName, setSupplierName] = useState(order.supplier_name)
    const [subject, setSubject] = useState(order.subject || t("defaultSubject"))
    const [notes, setNotes] = useState(order.notes ?? "")
    const [orderDate, setOrderDate] = useState(order.order_date.slice(0, 10))
    const [status, setStatus] = useState<PurchaseOrderStatus>(order.status)
    const [lines, setLines] = useState<PurchaseOrderLine[]>(order.lines)
    const [selectedIngredientId, setSelectedIngredientId] = useState("")
    const [isPending, startTransition] = useTransition()

    const sortedIngredients = useMemo(
        () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
        [ingredients]
    )

    const updateLine = (
        lineId: string,
        field: "item_name" | "order_quantity" | "memo",
        value: string
    ) => {
        setLines((current) =>
            current.map((line) => {
                if (line.id !== lineId) return line
                if (field === "order_quantity") {
                    return {
                        ...line,
                        order_quantity: value === "" ? null : Number(value),
                    }
                }
                return { ...line, [field]: value }
            })
        )
    }

    const save = () => {
        startTransition(async () => {
            const headerResult = await updatePurchaseOrderHeader(restaurantId, order.id, {
                supplier_name: supplierName,
                subject,
                notes,
                order_date: orderDate,
                status,
            })
            if (headerResult.error) {
                toast.error(headerResult.error)
                return
            }

            const linesResult = await updatePurchaseOrderLines(
                restaurantId,
                order.id,
                lines.map((line, index) => ({
                    id: line.id,
                    item_name: line.item_name,
                    order_quantity: line.order_quantity,
                    memo: line.memo,
                    sort_order: index,
                }))
            )
            if (linesResult.error) {
                toast.error(linesResult.error)
                return
            }

            toast.success(t("saveSuccess"))
            router.refresh()
        })
    }

    const addLine = () => {
        startTransition(async () => {
            const result = await addIngredientToPurchaseOrder(
                restaurantId,
                order.id,
                selectedIngredientId,
                lines.length
            )
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(t("addLineSuccess"))
            setLines((current) => [...current, result.line as PurchaseOrderLine])
            setSelectedIngredientId("")
            router.refresh()
        })
    }

    const removeLine = (lineId: string) => {
        startTransition(async () => {
            const result = await deletePurchaseOrderLine(restaurantId, order.id, lineId)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(t("deleteLineSuccess"))
            setLines((current) => current.filter((line) => line.id !== lineId))
            router.refresh()
        })
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-md border p-3 lg:flex-row lg:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                    <label htmlFor="purchase-order-supplier" className="text-sm font-medium">
                        {t("supplierLabel")}
                    </label>
                    <Input
                        id="purchase-order-supplier"
                        value={supplierName}
                        onChange={(event) => setSupplierName(event.target.value)}
                    />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                    <label htmlFor="purchase-order-subject" className="text-sm font-medium">
                        {t("subjectLabel")}
                    </label>
                    <Input
                        id="purchase-order-subject"
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                    />
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
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">{t("status")}</label>
                    <Select
                        value={status}
                        onValueChange={(value) => setStatus(value as PurchaseOrderStatus)}
                    >
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="draft">{t("statusDraft")}</SelectItem>
                                <SelectItem value="done">{t("statusDone")}</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <Badge variant={order.source_type === "summary" ? "secondary" : "outline"}>
                    {order.source_type === "summary" ? t("sourceSummary") : t("sourceBlank")}
                </Badge>
                <div className="flex gap-2">
                    <Button type="button" onClick={save} disabled={isPending}>
                        <Save />
                        {t("saveAction")}
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={`/print/${restaurantId}/kitchen/purchase-orders/${order.id}?locale=${locale}`} target="_blank">
                            <Printer />
                            {t("printAction")}
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-1.5 rounded-md border p-3">
                <label htmlFor="purchase-order-notes" className="text-sm font-medium">
                    {t("notes")}
                </label>
                <Textarea
                    id="purchase-order-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={t("notesPlaceholder")}
                    className="min-h-16 resize-none"
                />
            </div>

            <div className="flex items-end gap-2 rounded-md border p-3">
                <div className="flex flex-1 flex-col gap-1.5">
                    <label className="text-sm font-medium">{t("addIngredient")}</label>
                    <Select value={selectedIngredientId} onValueChange={setSelectedIngredientId}>
                        <SelectTrigger>
                            <SelectValue placeholder={t("ingredientPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {sortedIngredients.map((ingredient) => (
                                    <SelectItem key={ingredient.id} value={ingredient.id}>
                                        {ingredient.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={addLine}
                    disabled={isPending || !selectedIngredientId}
                >
                    <Plus />
                    {t("addLine")}
                </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("itemName")}</TableHead>
                            <TableHead className="text-right">{t("neededQuantity")}</TableHead>
                            <TableHead>{t("pack")}</TableHead>
                            <TableHead className="w-32 text-right">{t("orderQuantity")}</TableHead>
                            <TableHead className="w-64">{t("memo")}</TableHead>
                            <TableHead className="w-[70px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lines.map((line) => (
                            <TableRow key={line.id}>
                                <TableCell>
                                    <Input
                                        value={line.item_name}
                                        onChange={(event) =>
                                            updateLine(line.id, "item_name", event.target.value)
                                        }
                                        className="font-medium"
                                    />
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                    {line.needed_quantity ?? "—"} {line.unit ?? ""}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {line.package_size
                                        ? `× ${line.package_size}${line.unit ?? ""} ${line.package_label || t("defaultPackLabel")}`
                                        : "—"}
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        inputMode="decimal"
                                        className="text-right tabular-nums"
                                        value={numberInputValue(line.order_quantity)}
                                        onChange={(event) =>
                                            updateLine(line.id, "order_quantity", event.target.value)
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Textarea
                                        value={line.memo ?? ""}
                                        onChange={(event) =>
                                            updateLine(line.id, "memo", event.target.value)
                                        }
                                        className="min-h-9 resize-none"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeLine(line.id)}
                                        disabled={isPending}
                                    >
                                        <Trash2 />
                                        <span className="sr-only">{t("deleteLine")}</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {lines.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {t("noLines")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
