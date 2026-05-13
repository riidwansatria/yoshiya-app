"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Info, Printer, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"

import {
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
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

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

function getLinePrintUnit(line: PurchaseOrderLine) {
    return line.package_size ? line.package_label ?? "" : line.unit ?? ""
}

function getLineDefaultPrintUnit(
    line: PurchaseOrderLine,
    ref?: AggregatedIngredient
) {
    if (ref?.package_size) return ref.package_label ?? ""
    if (ref) return ref.unit ?? ""
    if (line.package_size) return line.default_package_label ?? line.package_label ?? ""
    return line.default_unit ?? line.unit ?? ""
}

function hasLinePackInfo(line: PurchaseOrderLine, ref?: AggregatedIngredient) {
    return Boolean(ref?.package_size ?? line.default_package_size ?? line.package_size)
}

function getLinePackDisplay(
    line: PurchaseOrderLine,
    defaultPackLabel: string,
    ref?: AggregatedIngredient
) {
    const packageSize = ref?.package_size ?? line.default_package_size ?? line.package_size
    const baseUnit = ref?.unit ?? line.default_unit ?? line.unit ?? ""
    const packageLabel = ref?.package_label ?? line.default_package_label ?? line.package_label ?? defaultPackLabel

    if (packageSize) return `× ${packageSize}${baseUnit} ${packageLabel}`
    return baseUnit || "—"
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
    const [appendIngredient, setAppendIngredient] = useState<Ingredient | null>(null)
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
        field: "item_name" | "order_quantity" | "memo" | "ingredient_id" | "print_unit",
        value: string | null
    ) => {
        setLines((current) =>
            current.map((line) => {
                if (line.id !== lineId) return line
                if (field === "order_quantity") {
                    if (value && !/^\d+$/.test(value)) return line
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
                        default_unit: selectedIngredient?.unit ?? null,
                        default_package_size: selectedIngredient?.package_size ?? null,
                        default_package_label: selectedIngredient?.package_label ?? null,
                    }
                }
                if (field === "print_unit") {
                    if (line.package_size) {
                        return { ...line, package_label: value || null }
                    }
                    return { ...line, unit: value || null }
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
                    unit: null,
                    package_size: null,
                    package_label: null,
                    default_unit: null,
                    default_package_size: null,
                    default_package_label: null,
                }
            })
        )
    }

    const save = () => {
        if (lines.some((line) => line.order_quantity !== null && line.order_quantity < 1)) {
            toast.error(t("orderQuantityMinError"))
            return
        }

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
                    id: line.id.startsWith("new-") ? undefined : line.id,
                    ingredient_id: line.ingredient_id,
                    item_name: line.item_name,
                    unit: line.unit,
                    category: line.category,
                    needed_quantity: line.needed_quantity,
                    package_size: line.package_size,
                    package_label: line.package_label,
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

    const addLine = (ingredientId: string) => {
        const selectedIngredient = ingredients.find((ingredient) => ingredient.id === ingredientId)
        if (!selectedIngredient) return

        const now = new Date().toISOString()
        const newLine: PurchaseOrderLine = {
            id: `new-${crypto.randomUUID()}`,
            purchase_order_id: order.id,
            ingredient_id: selectedIngredient.id,
            item_name: selectedIngredient.name,
            unit: selectedIngredient.unit,
            category: selectedIngredient.category,
            needed_quantity: null,
            package_size: selectedIngredient.package_size,
            package_label: selectedIngredient.package_label,
            default_unit: selectedIngredient.unit,
            default_package_size: selectedIngredient.package_size,
            default_package_label: selectedIngredient.package_label,
            order_quantity: null,
            memo: null,
            sort_order: lines.length,
            created_at: now,
            updated_at: now,
        }

        setLines((current) => [...current, newLine])
    }

    const removeLine = (lineId: string) => {
        setLines((current) => current.filter((line) => line.id !== lineId))
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

            <div className="min-h-0 flex-1 flex flex-col lg:flex-row gap-4">
                <div className="flex-1 overflow-auto rounded-md border min-w-0">
                    <Table className="table-fixed">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-40">{t("ingredientName")}</TableHead>
                                <TableHead>{t("itemName")}</TableHead>
                                <TableHead className="w-18">{t("orderQuantity")}</TableHead>
                                <TableHead className="w-28">{t("unit")}</TableHead>
                                <TableHead className="w-64">{t("memo")}</TableHead>
                                <TableHead className="w-10" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lines.map((line) => {
                                const ref = line.ingredient_id ? summaryLookup.get(line.ingredient_id) : undefined
                                const packDisplay = getLinePackDisplay(line, t("defaultPackLabel"), ref)
                                const printUnit = getLinePrintUnit(line)
                                const defaultPrintUnit = getLineDefaultPrintUnit(line, ref)
                                const showPackInfo = hasLinePackInfo(line, ref)
                            return (
                                <TableRow key={line.id}>
                                    <TableCell>
                                        <Combobox
                                            value={sortedIngredients.find(i => i.id === line.ingredient_id) ?? null}
                                            onValueChange={(ingredient) =>
                                                ingredient
                                                    ? updateLine(line.id, "ingredient_id", ingredient.id)
                                                    : clearLineIngredient(line.id)
                                            }
                                            items={sortedIngredients}
                                            itemToStringLabel={(ing) => ing.name}
                                        >
                                            <ComboboxInput
                                                placeholder="—"
                                                showClear={!!line.ingredient_id}
                                            />
                                            <ComboboxContent>
                                                <ComboboxEmpty>{t("none")}</ComboboxEmpty>
                                                <ComboboxList>
                                                    {(ing) => (
                                                        <ComboboxItem key={ing.id} value={ing}>
                                                            {ing.name}
                                                        </ComboboxItem>
                                                    )}
                                                </ComboboxList>
                                            </ComboboxContent>
                                        </Combobox>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={line.item_name}
                                            onChange={(event) =>
                                                updateLine(line.id, "item_name", event.target.value)
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            className="text-right tabular-nums"
                                            value={numberInputValue(line.order_quantity)}
                                            onChange={(event) =>
                                                updateLine(line.id, "order_quantity", event.target.value)
                                            }
                                            onBlur={() => {
                                                if (line.order_quantity !== null && line.order_quantity < 1) {
                                                    updateLine(line.id, "order_quantity", "1")
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative">
                                            <Input
                                                value={printUnit}
                                                placeholder={defaultPrintUnit}
                                                onChange={(event) =>
                                                    updateLine(line.id, "print_unit", event.target.value)
                                                }
                                                className={showPackInfo ? "pr-9" : undefined}
                                            />
                                            {showPackInfo ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground/55 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                        >
                                                            <Info className="size-3.5" />
                                                            <span className="sr-only">{packDisplay}</span>
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent sideOffset={4}>
                                                        {packDisplay}
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : null}
                                        </div>
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
                        <TableRow className="bg-muted/20 hover:bg-muted/30">
                            <TableCell>
                                <Combobox
                                    value={appendIngredient}
                                    onValueChange={(ingredient) => {
                                        if (!ingredient) {
                                            setAppendIngredient(null)
                                            return
                                        }
                                        addLine(ingredient.id)
                                        setAppendIngredient(null)
                                    }}
                                    items={sortedIngredients}
                                    itemToStringLabel={(ing) => ing.name}
                                >
                                    <ComboboxInput
                                        placeholder={t("addIngredient")}
                                        showClear={false}
                                    />
                                    <ComboboxContent>
                                        <ComboboxEmpty>{t("none")}</ComboboxEmpty>
                                        <ComboboxList>
                                            {(ing) => (
                                                <ComboboxItem key={ing.id} value={ing}>
                                                    {ing.name}
                                                </ComboboxItem>
                                            )}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                            </TableCell>
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell />
                        </TableRow>
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
