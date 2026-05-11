"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type ColumnFiltersState,
    type FilterFn,
    type SortingState,
    type VisibilityState,
} from "@tanstack/react-table"

import { deletePurchaseOrder } from "@/lib/actions/purchase-orders"
import type { PurchaseOrderListItem } from "@/lib/queries/purchase-orders"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/dice-ui/data-table/data-table-column-header"
import { DataTableSortList } from "@/components/dice-ui/data-table/data-table-sort-list"
import { DataTableToolbar } from "@/components/dice-ui/data-table/data-table-toolbar"
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
}

function formatDate(value: string) {
    return value.slice(0, 10)
}

const statusFilterFn: FilterFn<PurchaseOrderListItem> = (row, _columnId, filterValue: string[]) => {
    if (!filterValue?.length) return true
    return filterValue.includes(row.original.status)
}
statusFilterFn.autoRemove = (value: string[]) => !value?.length

const documentNoOrSupplierFilterFn: FilterFn<PurchaseOrderListItem> = (row, _columnId, filterValue) => {
    const query = String(filterValue).trim().toLowerCase()
    if (!query) return true

    return (
        row.original.document_no.toLowerCase().includes(query) ||
        row.original.supplier_name.toLowerCase().includes(query)
    )
}
documentNoOrSupplierFilterFn.autoRemove = (value) => !value

export function PurchaseOrdersList({
    restaurantId,
    orders,
}: PurchaseOrdersListProps) {
    const router = useRouter()
    const locale = useLocale()
    const t = useTranslations("kitchen.purchaseOrders")
    const [sorting, setSorting] = useState<SortingState>([
        { id: "document_no", desc: true },
    ])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        line_count: false,
        updated_at: false,
    })
    const [, startTransition] = useTransition()

    const removeOrder = useCallback((id: string) => {
        startTransition(async () => {
            const result = await deletePurchaseOrder(restaurantId, id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(t("deleteSuccess"))
            router.refresh()
        })
    }, [restaurantId, router, t])

    const columns = useMemo<ColumnDef<PurchaseOrderListItem>[]>(
        () => [
            {
                accessorKey: "document_no",
                enableColumnFilter: true,
                filterFn: documentNoOrSupplierFilterFn,
                meta: {
                    label: `${t("documentNo")} / ${t("supplierColumn")}`,
                    variant: "text",
                    placeholder: `${t("documentNo")} / ${t("supplierColumn")}`,
                },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t("documentNo")} />
                ),
                cell: ({ row }) => (
                    <Link
                        href={`/dashboard/${restaurantId}/kitchen/purchase-orders/${row.original.id}`}
                        className="font-medium tabular-nums hover:underline"
                    >
                        {row.original.document_no}
                    </Link>
                ),
            },
            {
                accessorKey: "supplier_name",
                enableColumnFilter: false,
                meta: {
                    label: t("supplierColumn"),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t("supplierColumn")} />
                ),
                cell: ({ row }) => row.original.supplier_name,
            },
            {
                accessorKey: "order_date",
                meta: {
                    label: t("orderDate"),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t("orderDate")} />
                ),
                cell: ({ row }) => formatDate(row.original.order_date),
            },
            {
                accessorKey: "status",
                enableColumnFilter: true,
                filterFn: statusFilterFn,
                meta: {
                    label: t("status"),
                    variant: "multiSelect",
                    options: [
                        { label: t("statusDraft"), value: "draft" },
                        { label: t("statusDone"), value: "done" },
                    ],
                },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t("status")} />
                ),
                cell: ({ row }) => (
                    <Badge variant={row.original.status === "done" ? "default" : "secondary"}>
                        {row.original.status === "done" ? t("statusDone") : t("statusDraft")}
                    </Badge>
                ),
            },
            {
                accessorKey: "line_count",
                meta: {
                    label: t("lineCount"),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        label={t("lineCount")}
                        className="ml-auto justify-end"
                    />
                ),
                cell: ({ row }) => (
                    <div className="text-right tabular-nums">{row.original.line_count}</div>
                ),
            },
            {
                accessorKey: "updated_at",
                meta: {
                    label: t("updatedAt"),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t("updatedAt")} />
                ),
                cell: ({ row }) => (
                    <span className="text-muted-foreground">
                        {formatDate(row.original.updated_at)}
                    </span>
                ),
            },
            {
                id: "actions",
                enableSorting: false,
                enableHiding: false,
                enableColumnFilter: false,
                size: 70,
                cell: ({ row }) => {
                    const order = row.original

                    return (
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
                    )
                },
            },
        ],
        [locale, removeOrder, restaurantId, t]
    )

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: orders,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    })

    return (
        <div className="flex h-full min-h-0 flex-col gap-2">
            <DataTableToolbar table={table} className="shrink-0 p-0">
                <DataTableSortList table={table} />
            </DataTableToolbar>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={table.getVisibleFlatColumns().length}
                                    className="h-24 text-center"
                                >
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
