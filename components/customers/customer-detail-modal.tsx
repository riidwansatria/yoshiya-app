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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { reservations, customers } from "@/lib/mock-data"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface CustomerDetailModalProps {
    customerId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CustomerDetailModal({ customerId, open, onOpenChange }: CustomerDetailModalProps) {
    const customer = customers.find(c => c.id === customerId)

    const customerHistory = reservations.filter(r => r.customerId === customerId)

    if (!customer) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Customer Detail</DialogTitle>
                    <DialogDescription>
                        {customer.id}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Name</Label>
                        <Input defaultValue={customer.name} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Email</Label>
                        <Input defaultValue={customer.email} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Phone</Label>
                        <Input defaultValue={customer.phone} className="col-span-3" />
                    </div>

                    <div className="border rounded-md mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Pax</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customerHistory.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.date}</TableCell>
                                        <TableCell>{r.partySize}</TableCell>
                                        <TableCell>{r.status}</TableCell>
                                    </TableRow>
                                ))}
                                {customerHistory.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center">No history</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={() => onOpenChange(false)}>Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
