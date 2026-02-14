"use client"

import * as React from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface TodayViewProps {
    restaurantId: string
    todayStr: string
    reservations: any[]
    menus?: any[]
}

export function TodayView({ restaurantId, todayStr, reservations, menus }: TodayViewProps) {
    const todayReservations = reservations

    const totalGuests = todayReservations.reduce((sum, r) => sum + (r.party_size || 0), 0)

    // Aggregate menus from reservation_menus
    // Structure: { [menuName]: totalQuantity }
    const menuCounts = todayReservations.reduce((acc, r) => {
        if (r.reservation_menus && r.reservation_menus.length > 0) {
            r.reservation_menus.forEach((rm: any) => {
                const name = rm.menu_name || 'Unknown'
                const qty = rm.quantity || 0
                acc[name] = (acc[name] || 0) + qty
            })
        }
        return acc
    }, {} as Record<string, number>)

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between no-print">
                <h1 className="text-2xl font-bold">Today: {todayStr}</h1>
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
                            {todayReservations.map((r: any) => (
                                <div key={r.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                                    <div>
                                        <div className="font-medium">
                                            {r.start_time?.substring(0, 5)} - {r.customers?.name || 'Unknown'}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {r.venues?.name || 'Unknown'} • {r.party_size} Pax
                                        </div>
                                        {r.notes && <div className="text-xs text-red-500 mt-1">{r.notes}</div>}
                                    </div>
                                    <div className="text-right text-sm">
                                        {r.reservation_menus?.map((rm: any) => (
                                            <div key={rm.id}>
                                                {rm.menu_name} x{rm.quantity}
                                            </div>
                                        ))}
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
                                    <span className="font-bold">{count as number}</span>
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
