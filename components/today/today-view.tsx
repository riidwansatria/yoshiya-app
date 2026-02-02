"use client"

import * as React from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { reservations, menus, customers, halls } from "@/lib/mock-data"
import { Separator } from "@/components/ui/separator"

interface TodayViewProps {
    restaurantId: string
}

export function TodayView({ restaurantId }: TodayViewProps) {
    // Mock today
    const today = '2026-01-30'

    const todayReservations = reservations.filter(r =>
        r.restaurant === restaurantId && r.date === today
    )

    const totalGuests = todayReservations.reduce((sum, r) => sum + r.partySize, 0)

    // Aggregate menus
    const menuCounts = todayReservations.reduce((acc, r) => {
        const menu = menus.find(m => m.id === r.menuId)
        if (menu) {
            acc[menu.name] = (acc[menu.name] || 0) + r.partySize
        }
        return acc
    }, {} as Record<string, number>)

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between no-print">
                <h1 className="text-2xl font-bold">Today: {today}</h1>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Summary
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Bookings Summary */}
                <Card className="print-card">
                    <CardHeader>
                        <CardTitle>Bookings Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mb-2">{todayReservations.length} Reservations</div>
                        <div className="text-muted-foreground mb-4">{totalGuests} Guests Expected</div>

                        <Separator className="my-4" />

                        <div className="space-y-4">
                            {todayReservations.map(r => (
                                <div key={r.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                                    <div>
                                        <div className="font-medium">{r.startTime} - {customers.find(c => c.id === r.customerId)?.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {halls.find(h => h.id === r.hallId)?.name} • {r.partySize} Pax
                                        </div>
                                        {r.serviceNotes && <div className="text-xs text-red-500 mt-1">{r.serviceNotes}</div>}
                                    </div>
                                    <div>
                                        {menus.find(m => m.id === r.menuId)?.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Menu Summary */}
                <Card className="print-card">
                    <CardHeader>
                        <CardTitle>Kitchen / Menu Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(menuCounts).map(([name, count]) => (
                                <div key={name} className="flex justify-between p-2 border rounded">
                                    <span>{name}</span>
                                    <span className="font-bold">{count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <style jsx global>{`
        @media print {
          .no-print { display: none; }
          .print-card { 
            border: none; 
            box-shadow: none;
            break-inside: avoid; 
          }
          body { background: white; }
          /* Reset layout for print */
          .md\\:grid-cols-2 { display: block; }
        }
      `}</style>
        </div>
    )
}
