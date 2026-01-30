"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { reservations, customers, halls, menus } from "@/lib/mock-data"

interface BookingDetailModalProps {
    bookingId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    restaurantId: string
}

export function BookingDetailModal({ bookingId, open, onOpenChange, restaurantId }: BookingDetailModalProps) {
    const router = useRouter()
    // In a real app, use SWR/React Query. Here, find in mock data.
    const booking = reservations.find(r => r.id === bookingId)

    const customer = customers.find(c => c.id === booking?.customerId)
    const hall = halls.find(h => h.id === booking?.hallId)
    const menu = menus.find(m => m.id === booking?.menuId)

    if (!booking) return null

    const handleInvoice = () => {
        router.push(`/dashboard/${restaurantId}/bookings/${bookingId}/invoice`)
        onOpenChange(false) // Close modal? Or keep open? Push navigates away so it's fine.
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Booking Detail</DialogTitle>
                    <DialogDescription>
                        {booking.id}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Customer</Label>
                        <div className="col-span-3 font-medium">{customer?.name}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Date/Time</Label>
                        <div className="col-span-3">
                            {booking.date} {booking.startTime} - {booking.endTime}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Hall</Label>
                        <Input defaultValue={hall?.name} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Pax</Label>
                        <Input type="number" defaultValue={booking.partySize} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Menu</Label>
                        <Select defaultValue={booking.menuId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select menu" />
                            </SelectTrigger>
                            <SelectContent>
                                {menus.map(m => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Status</Label>
                        <Select defaultValue={booking.status}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="deposit_paid">Deposit Paid</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Notes</Label>
                        <Input defaultValue={booking.notes} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel Booking</Button>
                    <Button variant="secondary" onClick={handleInvoice}>
                        <Printer className="mr-2 h-4 w-4" /> Invoice
                    </Button>
                    <Button type="submit" onClick={() => onOpenChange(false)}>Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
