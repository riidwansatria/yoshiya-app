"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, MoreHorizontal } from "lucide-react"


import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookingDetailModal } from "./booking-detail-modal"

export type Booking = {
    id: string
    date: string
    startTime: string
    partySize: number
    status: string
    customerName: string
    hallName: string
}

export function BookingsTable({ data: initialData, restaurantId }: { data: Booking[], restaurantId: string }) {
    const [data, setData] = React.useState(initialData)
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null)

    const updateData = (rowIndex: number, columnId: string, value: any) => {
        setData(old =>
            old.map((row, index) => {
                if (index === rowIndex) {
                    return {
                        ...old[rowIndex]!,
                        [columnId]: value,
                    }
                }
                return row
            })
        )
    }

    const columns: ColumnDef<Booking>[] = [
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => <div className="lowercase">{row.getValue("date")}</div>,
        },
        {
            accessorKey: "startTime",
            header: "Time",
        },
        {
            accessorKey: "hallName",
            header: "Hall",
        },
        {
            accessorKey: "customerName",
            header: "Customer",
        },
        {
            accessorKey: "partySize",
            header: "Pax",
            cell: ({ row, table }) => {
                const initialValue = row.getValue("partySize")
                const [value, setValue] = React.useState(initialValue)

                const onBlur = () => {
                    // @ts-ignore
                    updateData(row.index, "partySize", value)
                }

                return (
                    <Input
                        type="number"
                        value={value as number}
                        onChange={e => setValue(e.target.value)}
                        onBlur={onBlur}
                        className="w-16 h-8"
                    />
                )
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string

                return (
                    <Select
                        defaultValue={status}
                        onValueChange={(val) => updateData(row.index, "status", val)}
                    >
                        <SelectTrigger className="h-8 w-[130px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                )
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                return (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedBookingId(row.original.id)}
                    >
                        Details
                    </Button>
                )
            }
        }
    ]

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
        },
    })

    return (
        <div className="w-full">
            <div className="flex items-center py-4 gap-2">
                <Input
                    placeholder="Filter customers..."
                    value={(table.getColumn("customerName")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("customerName")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
            </div>
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-muted/50"
                                >
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
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>

            <BookingDetailModal
                bookingId={selectedBookingId}
                open={!!selectedBookingId}
                onOpenChange={(open) => !open && setSelectedBookingId(null)}
                restaurantId={restaurantId}
            />
        </div>
    )
}

