"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
import { updateBooking } from "@/lib/actions/bookings"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export type Booking = {
    id: string
    date: string
    startTime: string
    venueId: string | null
    partySize: number
    status: string
    customerName: string
    hallName: string
}

type StaffOption = { id: string; name: string; role: string };
type VenueOption = { id: string; name: string; capacity: number };
type OptimisticBookingPatch =
    | { type: "date"; bookingId: string; date: string }
    | { type: "status"; bookingId: string; status: string }
    | { type: "partySize"; bookingId: string; partySize: number }
    | { type: "startTime"; bookingId: string; startTime: string }
    | { type: "venue"; bookingId: string; venueId: string | null; hallName: string }
    | { type: "remove"; bookingId: string };

function toDateValue(date: string | null | undefined) {
    if (!date) return ""
    return date.slice(0, 10)
}

function isValidDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const [year, month, day] = value.split('-').map((part) => Number(part))
    const parsed = new Date(Date.UTC(year, month - 1, day))

    return (
        parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() + 1 === month
        && parsed.getUTCDate() === day
    )
}

function toTimeValue(time: string | null | undefined) {
    if (!time) return ""
    return time.slice(0, 5)
}

function isValidTime(value: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function BookingsTable({
    data: initialData,
    restaurantId,
    initialStaff,
    initialVenues,
}: {
    data: Booking[]
    restaurantId: string
    initialStaff: StaffOption[]
    initialVenues: VenueOption[]
}) {
    const router = useRouter()
    const t = useTranslations()
    const [data, setData] = React.useState(initialData)
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null)
    const [isPending, startTransition] = React.useTransition()
    const [pendingStatusIds, setPendingStatusIds] = React.useState<Record<string, boolean>>({})
    const [pendingPartySizeIds, setPendingPartySizeIds] = React.useState<Record<string, boolean>>({})
    const [pendingStartTimeIds, setPendingStartTimeIds] = React.useState<Record<string, boolean>>({})
    const [pendingVenueIds, setPendingVenueIds] = React.useState<Record<string, boolean>>({})
    const [pendingDateIds, setPendingDateIds] = React.useState<Record<string, boolean>>({})

    const [optimisticData, addOptimisticPatch] = React.useOptimistic(
        data,
        (state, payload: OptimisticBookingPatch) => {
            if (payload.type === "remove") {
                return state.filter((row) => row.id !== payload.bookingId)
            }

            return state.map((row) => {
                if (row.id !== payload.bookingId) return row

                if (payload.type === "status") {
                    return { ...row, status: payload.status }
                }

                if (payload.type === "date") {
                    return { ...row, date: payload.date }
                }

                if (payload.type === "partySize") {
                    return { ...row, partySize: payload.partySize }
                }

                if (payload.type === "startTime") {
                    return { ...row, startTime: payload.startTime }
                }

                return { ...row, venueId: payload.venueId, hallName: payload.hallName }
            })
        }
    )

    const handleDateChange = (bookingId: string, nextDate: string) => {
        const currentDate = toDateValue(data.find((row) => row.id === bookingId)?.date)
        if (currentDate === nextDate) return

        addOptimisticPatch({ type: "date", bookingId, date: nextDate })
        setPendingDateIds((prev) => ({ ...prev, [bookingId]: true }))

        startTransition(async () => {
            const result = await updateBooking(bookingId, { date: nextDate })

            setPendingDateIds((prev) => {
                const next = { ...prev }
                delete next[bookingId]
                return next
            })

            if (!result.success) {
                toast.error(result.error ?? t('bookingModal.errors.updateDateFailed'))
                router.refresh()
                return
            }

            setData((old) =>
                old.map((row) =>
                    row.id === bookingId ? { ...row, date: nextDate } : row
                )
            )
            router.refresh()
        })
    }

    const handleStatusChange = (bookingId: string, nextStatus: string) => {
        const currentStatus = data.find((row) => row.id === bookingId)?.status
        if (currentStatus === nextStatus) return

        addOptimisticPatch({ type: "status", bookingId, status: nextStatus })
        setPendingStatusIds((prev) => ({ ...prev, [bookingId]: true }))

        startTransition(async () => {
            const result = await updateBooking(bookingId, { status: nextStatus })

            setPendingStatusIds((prev) => {
                const next = { ...prev }
                delete next[bookingId]
                return next
            })

            if (!result.success) {
                toast.error(result.error ?? "Failed to update booking status")
                router.refresh()
                return
            }

            setData((old) =>
                old.map((row) =>
                    row.id === bookingId ? { ...row, status: nextStatus } : row
                )
            )
            router.refresh()
        })
    }

    const handlePartySizeChange = (bookingId: string, nextPartySize: number) => {
        const currentPartySize = data.find((row) => row.id === bookingId)?.partySize
        if (currentPartySize === nextPartySize) return

        addOptimisticPatch({ type: "partySize", bookingId, partySize: nextPartySize })
        setPendingPartySizeIds((prev) => ({ ...prev, [bookingId]: true }))

        startTransition(async () => {
            const result = await updateBooking(bookingId, { party_size: nextPartySize })

            setPendingPartySizeIds((prev) => {
                const next = { ...prev }
                delete next[bookingId]
                return next
            })

            if (!result.success) {
                toast.error(result.error ?? "Failed to update party size")
                router.refresh()
                return
            }

            setData((old) =>
                old.map((row) =>
                    row.id === bookingId ? { ...row, partySize: nextPartySize } : row
                )
            )
            router.refresh()
        })
    }

    const handleBookingDeleted = (bookingId: string) => {
        addOptimisticPatch({ type: "remove", bookingId })
        setData((old) => old.filter((row) => row.id !== bookingId))
        setSelectedBookingId(null)
    }

    const handleStartTimeChange = (bookingId: string, nextStartTime: string) => {
        const currentStartTime = toTimeValue(data.find((row) => row.id === bookingId)?.startTime)
        if (currentStartTime === nextStartTime) return

        addOptimisticPatch({ type: "startTime", bookingId, startTime: nextStartTime })
        setPendingStartTimeIds((prev) => ({ ...prev, [bookingId]: true }))

        startTransition(async () => {
            const result = await updateBooking(bookingId, { start_time: nextStartTime })

            setPendingStartTimeIds((prev) => {
                const next = { ...prev }
                delete next[bookingId]
                return next
            })

            if (!result.success) {
                toast.error(result.error ?? t('bookingModal.errors.updateTimeFailed'))
                router.refresh()
                return
            }

            setData((old) =>
                old.map((row) =>
                    row.id === bookingId ? { ...row, startTime: nextStartTime } : row
                )
            )
            router.refresh()
        })
    }

    const handleVenueChange = (bookingId: string, venueId: string) => {
        const nextVenueId = venueId === "__unassigned__" ? null : venueId
        const currentVenueId = data.find((row) => row.id === bookingId)?.venueId ?? null
        if (currentVenueId === nextVenueId) return

        const hallName = nextVenueId
            ? (initialVenues.find((venue) => venue.id === nextVenueId)?.name ?? "Unknown")
            : t('bookingModal.unassignedHall')

        addOptimisticPatch({ type: "venue", bookingId, venueId: nextVenueId, hallName })
        setPendingVenueIds((prev) => ({ ...prev, [bookingId]: true }))

        startTransition(async () => {
            const result = await updateBooking(bookingId, { venue_id: nextVenueId ?? '' })

            setPendingVenueIds((prev) => {
                const next = { ...prev }
                delete next[bookingId]
                return next
            })

            if (!result.success) {
                toast.error(result.error ?? t('bookingModal.errors.updateHallFailed'))
                router.refresh()
                return
            }

            setData((old) =>
                old.map((row) =>
                    row.id === bookingId ? { ...row, venueId: nextVenueId, hallName } : row
                )
            )
            router.refresh()
        })
    }

    const columns: ColumnDef<Booking>[] = [
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => {
                const rowDate = toDateValue(String(row.getValue("date") ?? ""))
                const [value, setValue] = React.useState(rowDate)
                const isRowPending = Boolean(pendingDateIds[row.original.id])

                React.useEffect(() => {
                    setValue(rowDate)
                }, [rowDate])

                const onBlur = () => {
                    if (!isValidDate(value)) {
                        setValue(rowDate)
                        toast.error(t('bookingModal.errors.invalidDate'))
                        return
                    }

                    handleDateChange(row.original.id, value)
                }

                return (
                    <Input
                        type="date"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onBlur={onBlur}
                        disabled={isRowPending || isPending}
                        className="h-8 w-38"
                    />
                )
            },
        },
        {
            accessorKey: "startTime",
            header: "Time",
            cell: ({ row }) => {
                const rowTime = toTimeValue(String(row.getValue("startTime") ?? ""))
                const [value, setValue] = React.useState(rowTime)
                const isRowPending = Boolean(pendingStartTimeIds[row.original.id])

                React.useEffect(() => {
                    setValue(rowTime)
                }, [rowTime])

                const onBlur = () => {
                    if (!isValidTime(value)) {
                        setValue(rowTime)
                        toast.error(t('bookingModal.errors.invalidStartTime'))
                        return
                    }

                    handleStartTimeChange(row.original.id, value)
                }

                return (
                    <Input
                        type="time"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onBlur={onBlur}
                        disabled={isRowPending || isPending}
                        className="h-8 w-30"
                    />
                )
            }
        },
        {
            accessorKey: "hallName",
            header: "Hall",
            cell: ({ row }) => {
                const venueValue = row.original.venueId ?? "__unassigned__"
                const isRowPending = Boolean(pendingVenueIds[row.original.id])

                return (
                    <Select
                        value={venueValue}
                        onValueChange={(value) => handleVenueChange(row.original.id, value)}
                        disabled={isRowPending || isPending}
                    >
                        <SelectTrigger className="h-8 w-40">
                            <SelectValue placeholder={t('bookingModal.unassignedHall')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__unassigned__">{t('bookingModal.unassignedHall')}</SelectItem>
                            {initialVenues.map((venue) => (
                                <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )
            }
        },
        {
            accessorKey: "customerName",
            header: "Customer",
        },
        {
            accessorKey: "partySize",
            header: "Pax",
            cell: ({ row }) => {
                const rowPartySize = Number(row.getValue("partySize") ?? 0)
                const [value, setValue] = React.useState(String(rowPartySize))
                const isRowPending = Boolean(pendingPartySizeIds[row.original.id])

                React.useEffect(() => {
                    setValue(String(rowPartySize))
                }, [rowPartySize])

                const onBlur = () => {
                    const parsed = Number(value)

                    if (!Number.isFinite(parsed) || parsed < 0) {
                        setValue(String(rowPartySize))
                        toast.error(t('bookingModal.errors.invalidPartySize'))
                        return
                    }

                    handlePartySizeChange(row.original.id, parsed)
                }

                return (
                    <Input
                        type="number"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onBlur={onBlur}
                        disabled={isRowPending || isPending}
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
                const isRowPending = Boolean(pendingStatusIds[row.original.id])

                return (
                    <Select
                        value={status}
                        onValueChange={(val) => handleStatusChange(row.original.id, val)}
                        disabled={isRowPending || isPending}
                    >
                        <SelectTrigger className="h-8 w-32.5">
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
        data: optimisticData,
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
                initialStaff={initialStaff}
                initialVenues={initialVenues}
                onDeleted={handleBookingDeleted}
            />
        </div>
    )
}

