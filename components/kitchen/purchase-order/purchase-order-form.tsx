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
import type { Vendor } from "@/lib/queries/vendors"
import type { AggregatedIngredient } from "@/lib/queries/ingredients-summary"
import { Button } from "@/components/ui/button"
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
    vendors: Vendor[]
    summaryReference?: AggregatedIngredient[]
    sourceDateFrom?: string | null
    sourceDateTo?: string | null
}

function numberInputValue(value: number | null) {
    return value === null ? "" : String(value)
}

export function PurchaseOrderForm({
    restaurantId,
    order,
    ingredients,
    vendors,
    summaryReference,
    sourceDateFrom,
    sourceDateTo,
}: PurchaseOrderFormProps) {
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations("kitchen.purchaseOrders")
    const initialVendor = useMemo(
        () => vendors.find((vendor) => vendor.id === order.vendor_id) ?? vendors.find((vendor) => vendor.name === order.supplier_name) ?? null,
        [order.supplier_name, order.vendor_id, vendors]
    )
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(initialVendor)
    const [subject, setSubject] = useState(order.subject || t("defaultSubject"))
    const [notes, setNotes] = useState(order.notes ?? "")
    const [orderDate, setOrderDate] = useState(order.order_date.slice(0, 10))
    const [status, setStatus] = useState<PurchaseOrderStatus>(order.status)
    const [localSourceDateFrom, setLocalSourceDateFrom] = useState(sourceDateFrom ?? "")
    const [localSourceDateTo, setLocalSourceDateTo] = useState(sourceDateTo ?? "")
    const [lines, setLines] = useState<PurchaseOrderLine[]>(order.lines)
    const [selectedIngredientId, setSelectedIngredientId] = useState("")
    const [isPending, startTransition] = useTransition()

    const sortedIngredients = useMemo(
        () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
        [ingredients]
    )

    const summaryLookup = useMemo(
        () => new Map((summaryReference ?? []).map((item) => [item.ingredient_id, item])),
        [summaryReference]
    )

    const updateLine = (
        lineId: string,
        field: "item_name" | "order_quantity" | "memo" | "ingredient_id",
        value: string | null
    ) => {
        setLines((current) =>
            current.map((line) => {
                if (line.id !== lineId) return line
                if (field === "order_quantity") {
                    return {
                        ...line,
                        order_quantity: value === "" || value === null ? null : Number(value),
                    }
                }
                if (field === "ingredient_id") {
                    const selectedIngredient = ingredients.find(i => i.id === value)
                    return {
                        ...line,
                        ingredient_id: value,
                        item_name: selectedIngredient?.name ?? line.item_name,
                        unit: selectedIngredient?.unit ?? line.unit,
                        category: selectedIngredient?.category ?? line.category,
                        package_size: selectedIngredient?.package_size ?? line.package_size,
                        package_label: selectedIngredient?.package_label ?? line.package_label,
                    }
                }
                return { ...line, [field]: value }
            })
        )
    }

    const clearLineIngredient = (lineId: string) => {
        setLines((current) =>
            current.map((line) => {
                if (line.id !== lineId) return line
                return {
                    ...line,
                    ingredient_id: null,
                }
            })
        )
    }

    const save = () => {
        startTransition(async () => {
            const headerResult = await updatePurchaseOrderHeader(restaurantId, order.id, {
                supplier_name: selectedVendor?.name ?? "",
                vendor_id: selectedVendor?.id ?? null,
                subject,
                notes,
                order_date: orderDate,
                status,
                source_date_from: localSourceDateFrom || null,
                source_date_to: localSourceDateTo || null,
                source_type: (localSourceDateFrom && localSourceDateTo) ? "summary" : "manual"
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
                    ingredient_id: line.ingredient_id,
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
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">{t("documentNo")}</label>
                    <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm tabular-nums text-muted-foreground">
                        {order.document_no}
                    </div>
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
                <div className="flex gap-2">
                    <Button type="button" onClick={save} disabled={isPending || !selectedVendor}>
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

            <div className="min-h-0 flex-1 flex flex-col lg:flex-row gap-4">
                <div className="flex-1 overflow-auto rounded-md border min-w-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("ingredientName")}</TableHead>
                                <TableHead>{t("itemName")}</TableHead>
                                <TableHead>{t("pack")}</TableHead>
                                <TableHead className="w-32 text-right">{t("orderQuantity")}</TableHead>
                                <TableHead className="w-64">{t("memo")}</TableHead>
                                <TableHead className="w-[70px]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lines.map((line) => {
                                const ref = line.ingredient_id ? summaryLookup.get(line.ingredient_id) : undefined
                                const packDisplay = ref?.package_size
                                ? `× ${ref.package_size}${ref.unit} ${ref.package_label || t("defaultPackLabel")}`
                                : line.package_size
                                ? `× ${line.package_size}${line.unit ?? ""} ${line.package_label || t("defaultPackLabel")}`
                                : "—"
                            return (
                                <TableRow key={line.id}>
                                    <TableCell>
                                        <Select
                                            value={line.ingredient_id ?? "unassigned"}
                                            onValueChange={(value) => 
                                                value === "unassigned" 
                                                    ? clearLineIngredient(line.id)
                                                    : updateLine(line.id, "ingredient_id", value)
                                            }
                                        >
                                            <SelectTrigger className="w-full min-w-32 border-0 shadow-none px-1 h-8 focus:ring-0">
                                                <SelectValue placeholder="—" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="unassigned" className="text-muted-foreground italic">
                                                        {t("none")}
                                                    </SelectItem>
                                                    {sortedIngredients.map((ing) => (
                                                        <SelectItem key={ing.id} value={ing.id}>
                                                            {ing.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={line.item_name}
                                            onChange={(event) =>
                                                updateLine(line.id, "item_name", event.target.value)
                                            }
                                        />
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {packDisplay}
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
                            )
                        })}
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
            <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4 overflow-hidden rounded-md border bg-muted/30">
                <div className="p-3 pb-0 flex flex-col gap-3">
                    <div className="text-sm font-semibold">{t("liveNeededMetrics")}</div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">
                            {t("supplierLabel")}
                        </label>
                        <Combobox
                            value={selectedVendor}
                            onValueChange={setSelectedVendor}
                            items={vendors}
                            itemToStringLabel={(vendor) => vendor.name}
                            autoHighlight
                        >
                            <ComboboxInput
                                id="purchase-order-supplier"
                                placeholder={t("vendorPlaceholder")}
                                showClear={!!selectedVendor}
                                className="h-8 text-xs"
                            />
                            <ComboboxContent>
                                <ComboboxEmpty>{t("vendorEmpty")}</ComboboxEmpty>
                                <ComboboxList>
                                    {(vendor) => (
                                        <ComboboxItem key={vendor.id} value={vendor} className="text-xs">
                                            {vendor.name}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex flex-1 flex-col gap-1.5">
                            <label className="text-xs text-muted-foreground">
                                {t("sourceDateFrom")}
                            </label>
                            <Input
                                type="date"
                                className="h-8 text-xs px-2"
                                value={localSourceDateFrom}
                                onChange={(event) => setLocalSourceDateFrom(event.target.value)}
                            />
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5">
                            <label className="text-xs text-muted-foreground">
                                {t("sourceDateTo")}
                            </label>
                            <Input
                                type="date"
                                className="h-8 text-xs px-2"
                                value={localSourceDateTo}
                                onChange={(event) => setLocalSourceDateTo(event.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto min-h-0 border-t">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="py-2 h-9 text-xs">{t("ingredientName")}</TableHead>
                                <TableHead className="py-2 h-9 text-xs text-right">{t("neededQuantity")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summaryReference && summaryReference.length > 0 ? (
                                summaryReference.map((ref) => (
                                    <TableRow key={ref.ingredient_id}>
                                        <TableCell className="font-medium text-xs py-2">
                                            {ref.name}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-xs py-2">
                                            {ref.total_quantity} {ref.unit}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center text-xs text-muted-foreground">
                                        {t("sourceBlank")}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    </div>
    )
}
