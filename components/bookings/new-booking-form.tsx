"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { halls, menus } from "@/lib/mock-data"
import { toast } from "sonner" // Changed to sonner as requested

interface NewBookingFormProps {
    restaurantId: string
}

export function NewBookingForm({ restaurantId }: NewBookingFormProps) {
    const [open, setOpen] = React.useState(false)
    const restaurantHalls = halls.filter(h => h.restaurant === restaurantId)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        // Mock submit
        toast.success("Booking created successfully")
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>+ New Booking</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>New Booking</DialogTitle>
                        <DialogDescription>
                            Create a new reservation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="customer" className="text-right">Customer</Label>
                            <Input id="customer" placeholder="Search customer..." className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">Date</Label>
                            <Input id="date" type="date" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time" className="text-right">Time</Label>
                            <div className="col-span-3 flex gap-2">
                                <Input type="time" required className="flex-1" />
                                <span className="self-center">-</span>
                                <Input type="time" required className="flex-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Hall</Label>
                            <Select>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select hall" />
                                </SelectTrigger>
                                <SelectContent>
                                    {restaurantHalls.map(h => (
                                        <SelectItem key={h.id} value={h.id}>{h.name} ({h.capacity})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="pax" className="text-right">Pax</Label>
                            <Input id="pax" type="number" className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Menu</Label>
                            <Select>
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
                    </div>
                    <DialogFooter>
                        <Button type="submit">Create Booking</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
