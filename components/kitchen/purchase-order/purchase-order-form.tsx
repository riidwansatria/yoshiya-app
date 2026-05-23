"use client"

import { useMemo, useState, useSyncExternalStore, useTransition } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Info, Mail, MoreHorizontal, Phone, Printer, Save, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"

import {
    updatePurchaseOrderHeader,
    updatePurchaseOrderLines,
} from "@/lib/actions/purchase-orders"
import { SendPurchaseOrderDialog } from "@/components/kitchen/purchase-order/send-purchase-order-dialog"
import type {
    PurchaseOrderDetail,
    PurchaseOrderLine,
    PurchaseOrderStatus,
} from "@/lib/queries/purchase-orders"
import type { Ingredient } from "@/lib/queries/ingredients"
import type { Vendor } from "@/lib/queries/vendors"
import type { AggregatedIngredient } from "@/lib/queries/ingredients-summary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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

function getDisplayStatus(order: PurchaseOrderDetail): PurchaseOrderStatus {
    return order.status === "sent" || order.sent_at || order.recipient_email ? "sent" : "draft"
}

function getSourceType(sourceDateFrom: string, sourceDateTo: string) {
    return sourceDateFrom && sourceDateTo ? "summary" : "blank"
}

function buildEditSnapshot({
    selectedVendor,
    subject,
    notes,
    orderDate,
    sourceDateFrom,
    sourceDateTo,
    lines,
}: {
    selectedVendor: Vendor | null
    subject: string
    notes: string
    orderDate: string
    sourceDateFrom: string
    sourceDateTo: string
    lines: PurchaseOrderLine[]
}) {
    return JSON.stringify({
        supplier_name: selectedVendor?.name.trim() ?? "",
        vendor_id: selectedVendor?.id ?? null,
        subject: subject.trim(),
        notes: notes.trim(),
        order_date: orderDate,
        source_date_from: sourceDateFrom || null,
        source_date_to: sourceDateTo || null,
        source_type: getSourceType(sourceDateFrom, sourceDateTo),
        lines: lines.map((line, index) => ({
            id: line.id.startsWith("new-") ? null : line.id,
            ingredient_id: line.ingredient_id,
            item_name: line.item_name.trim(),
            unit: line.unit?.trim() || null,
            category: line.category?.trim() || null,
            needed_quantity: line.needed_quantity,
            package_size: line.package_size,
            package_label: line.package_label?.trim() || null,
            order_quantity: line.order_quantity,
            memo: line.memo?.trim() || null,
            sort_order: index,
        })),
    })
}

function subscribeActionsPortalStore() {
    return () => undefined
}

function getActionsPortalTarget() {
    return typeof document === "undefined"
        ? null
        : document.getElementById("purchase-order-actions-slot")
}

function getServerActionsPortalTarget() {
    return null
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
    const [status, setStatus] = useState<PurchaseOrderStatus>(getDisplayStatus(order))
    const [localSourceDateFrom, setLocalSourceDateFrom] = useState(sourceDateFrom ?? "")
    const [localSourceDateTo, setLocalSourceDateTo] = useState(sourceDateTo ?? "")
    const [lines, setLines] = useState<PurchaseOrderLine[]>(order.lines)
    const [appendIngredient, setAppendIngredient] = useState<Ingredient | null>(null)
    const [showOtherVendors, setShowOtherVendors] = useState(false)
    const [sendDialogOpen, setSendDialogOpen] = useState(false)
    const [saveFirstDialogOpen, setSaveFirstDialogOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const actionsPortalTarget = useSyncExternalStore(
        subscribeActionsPortalStore,
        getActionsPortalTarget,
        getServerActionsPortalTarget
    )
    const currentSnapshot = useMemo(
        () => buildEditSnapshot({
            selectedVendor,
            subject,
            notes,
            orderDate,
            sourceDateFrom: localSourceDateFrom,
            sourceDateTo: localSourceDateTo,
            lines,
        }),
        [selectedVendor, subject, notes, orderDate, localSourceDateFrom, localSourceDateTo, lines]
    )
    const [savedSnapshot, setSavedSnapshot] = useState(currentSnapshot)
    const hasUnsavedChanges = currentSnapshot !== savedSnapshot

    const { currentGroup, otherGroups } = useMemo(() => {
        const groups = new Map<string, { vendorName: string; vendorId: string | null; items: AggregatedIngredient[] }>()
        for (const ref of summaryReference ?? []) {
            const key = ref.vendor_id ?? "__none__"
            if (!groups.has(key)) {
                groups.set(key, { vendorName: ref.vendor_name ?? "", vendorId: ref.vendor_id, items: [] })
            }
            groups.get(key)!.items.push(ref)
        }
        const sorted = Array.from(groups.values()).sort((a, b) => {
            if (a.vendorId === selectedVendor?.id) return -1
            if (b.vendorId === selectedVendor?.id) return 1
            return a.vendorName.localeCompare(b.vendorName, locale)
        })
        const idx = sorted.findIndex((g) => g.vendorId === selectedVendor?.id)
        return {
            currentGroup: idx >= 0 ? sorted[idx] : null,
            otherGroups: sorted.filter((_, i) => i !== idx),
        }
    }, [summaryReference, selectedVendor, locale])

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

    const persistOrder = async (options: { silent?: boolean } = {}) => {
        if (lines.some((line) => line.order_quantity !== null && line.order_quantity < 1)) {
            toast.error(t("orderQuantityMinError"))
            return false
        }

        const headerResult = await updatePurchaseOrderHeader(restaurantId, order.id, {
            supplier_name: selectedVendor?.name ?? "",
            vendor_id: selectedVendor?.id ?? null,
            subject,
            notes,
            order_date: orderDate,
            status,
            source_date_from: localSourceDateFrom || null,
            source_date_to: localSourceDateTo || null,
            source_type: getSourceType(localSourceDateFrom, localSourceDateTo)
        })
        if (headerResult.error) {
            toast.error(headerResult.error)
            return false
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
            return false
        }

        setSavedSnapshot(currentSnapshot)
        if (!options.silent) {
            toast.success(t("saveSuccess"))
        }
        router.refresh()
        return true
    }

    const save = () => {
        startTransition(() => {
            void persistOrder()
        })
    }

    const saveFromPrompt = () => {
        startTransition(async () => {
            const saved = await persistOrder()
            if (saved) {
                setSaveFirstDialogOpen(false)
            }
        })
    }

    const openSendDialog = () => {
        if (hasUnsavedChanges) {
            setSaveFirstDialogOpen(true)
            return
        }

        setSendDialogOpen(true)
    }

    const handleSent = () => {
        setStatus("sent")
        router.refresh()
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

    const baseStatusLabel = status === "sent"
        ? t("statusSent")
        : t("statusDraft")
    const statusLabel = hasUnsavedChanges
        ? t("statusUnsaved", { status: baseStatusLabel })
        : baseStatusLabel

    const actions = (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={hasUnsavedChanges ? "outline" : status === "sent" ? "default" : "secondary"}>
                {statusLabel}
            </Badge>
            <Button
                type="button"
                variant="outline"
                onClick={save}
                disabled={isPending || !selectedVendor}
            >
                <Save />
                {t("saveAction")}
            </Button>
            <Button type="button" onClick={openSendDialog} disabled={isPending || !selectedVendor}>
                <Send />
                {status === "sent" ? t("resendAction") : t("sendAction")}
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon">
                        <MoreHorizontal />
                        <span className="sr-only">More actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/api/kitchen/purchase-orders/${order.id}/pdf?restaurant=${restaurantId}`} target="_blank">
                            <Printer />
                            {t("printAction")}
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )

    return (
        <>
            {actionsPortalTarget ? createPortal(actions, actionsPortalTarget) : null}
            <div className="flex flex-wrap items-start gap-3 rounded-md border p-3 shrink-0">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">{t("documentNo")}</label>
                    <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm tabular-nums text-muted-foreground">
                        {order.document_no}
                    </div>
                </div>
                <div className="flex min-w-44 flex-[1.4] flex-col gap-1.5">
                    <label className="text-sm font-semibold">
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
                        />
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
                    {(selectedVendor?.email || selectedVendor?.tel) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {selectedVendor.email && (
                                <span className="flex items-center gap-1">
                                    <Mail className="size-3 shrink-0" />
                                    {selectedVendor.email}
                                </span>
                            )}
                            {selectedVendor.tel && (
                                <span className="flex items-center gap-1">
                                    <Phone className="size-3 shrink-0" />
                                    {selectedVendor.tel}
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex min-w-36 flex-1 flex-col gap-1.5">
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
                    <DatePicker
                        value={orderDate}
                        onChange={setOrderDate}
                        locale={locale === "ja" ? "ja" : "en"}
                        className="h-9"
                    />
                </div>
            </div>

            <div className="min-h-0 flex-1 flex flex-col lg:flex-row gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="min-h-0 flex-1 overflow-auto rounded-md border">
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

                    <div className="flex shrink-0 flex-col gap-1.5 rounded-md border p-3">
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
                </div>
                <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4 overflow-hidden rounded-md border bg-muted/30">
                <div className="p-3 pb-0 flex flex-col gap-3">
                    <div className="text-sm font-semibold">{t("liveNeededMetrics")}</div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-muted-foreground">
                            {t("sourceDateFrom")} / {t("sourceDateTo")}
                        </label>
                        <DateRangePicker
                            from={localSourceDateFrom}
                            to={localSourceDateTo}
                            onChange={(from, to) => {
                                setLocalSourceDateFrom(from)
                                setLocalSourceDateTo(to)
                            }}
                            locale={locale === "ja" ? "ja" : "en"}
                            className="h-8 w-full px-2 text-xs"
                        />
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
                            {currentGroup || otherGroups.length > 0 ? (
                                <>
                                    {currentGroup ? currentGroup.items.map((ref) => (
                                        <TableRow key={ref.ingredient_id}>
                                            <TableCell className="font-medium text-xs py-2">
                                                <div className="min-w-0">
                                                    <div className="truncate">{ref.name}</div>
                                                    {ref.vendor_name ? (
                                                        <div className="truncate text-[11px] font-normal text-muted-foreground">
                                                            {ref.vendor_name}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums text-xs py-2">
                                                {ref.total_quantity} {ref.unit}
                                            </TableCell>
                                        </TableRow>
                                    )) : null}
                                    {otherGroups.length > 0 ? (
                                        <>
                                            <TableRow>
                                                <TableCell colSpan={2} className="py-1 px-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowOtherVendors((v) => !v)}
                                                        className="flex w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        {showOtherVendors ? t("hideMore") : t("showMore", { count: otherGroups.reduce((s, g) => s + g.items.length, 0) })}
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                            {showOtherVendors ? otherGroups.flatMap((group) =>
                                                group.items.map((ref) => (
                                                    <TableRow key={ref.ingredient_id}>
                                                        <TableCell className="font-medium text-xs py-2">
                                                            <div className="min-w-0">
                                                                <div className="truncate">{ref.name}</div>
                                                                {ref.vendor_name ? (
                                                                    <div className="truncate text-[11px] font-normal text-muted-foreground">
                                                                        {ref.vendor_name}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right tabular-nums text-xs py-2">
                                                            {ref.total_quantity} {ref.unit}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : null}
                                        </>
                                    ) : null}
                                </>
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
            <SendPurchaseOrderDialog
                restaurantId={restaurantId}
                orderId={order.id}
                subject={subject}
                documentNo={order.document_no}
                initialEmail={selectedVendor?.email ?? order.recipient_email ?? ""}
                open={sendDialogOpen}
                onOpenChange={setSendDialogOpen}
                isResend={status === "sent"}
                onSent={handleSent}
            />
            <Dialog open={saveFirstDialogOpen} onOpenChange={setSaveFirstDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("saveBeforeSendTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("saveBeforeSendDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSaveFirstDialogOpen(false)}
                            disabled={isPending}
                        >
                            {t("sendCancel")}
                        </Button>
                        <Button type="button" onClick={saveFromPrompt} disabled={isPending || !selectedVendor}>
                            <Save />
                            {t("saveAction")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
