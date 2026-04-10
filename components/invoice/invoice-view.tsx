"use client"

import * as React from "react"
import { Printer, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"

interface InvoiceViewProps {
    restaurantId: string
    bookingId: string
    initialBooking?: any
}

export function InvoiceView({ restaurantId, bookingId, initialBooking }: InvoiceViewProps) {
    const t = useTranslations('invoice')

    const booking = initialBooking;
    if (!booking) return <div>Booking not found</div>

    const items: any[] = [];
    let index = 1;
    const menuItems = booking.reservation_menus || [];
    
    menuItems.forEach((menuItem: any) => {
       items.push({
           id: index++,
           description: menuItem.menu_name || "Menu",
           quantity: menuItem.quantity || booking.party_size,
           price: menuItem.unit_price || 0,
           amount: (menuItem.quantity || booking.party_size) * (menuItem.unit_price || 0)
       });
    });

    if (items.length > 0) {
        items.push({
          id: index++,
          description: "Service Charge",
          quantity: 1,
          price: 5000,
          amount: 5000,
        });
    } else {
        items.push({
            id: 1,
            description: "Banquet Booking",
            quantity: booking.party_size || 1,
            price: 0,
            amount: 0
        })
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0)
    const tax = subtotal * 0.1
    const total = subtotal + tax
    const deposit = booking.status === 'deposit_paid' ? 10000 : 0
    const balance = total - deposit

    const handlePrint = () => window.print()

    const handleDownloadExcel = () => {
        // The browser will automatically download the file stream
        window.open(`/api/invoice/generate?bookingId=${booking.id}&restaurantId=${restaurantId}`, '_blank')
    }

    const billedToName = booking.customers?.name || booking.rep_name || booking.group_name || "Guest";

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 min-h-screen">
            {/* Header Actions */}
            <div className="flex justify-end gap-2 mb-8 no-print">
                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button onClick={handleDownloadExcel}>
                    <Download className="mr-2 h-4 w-4" /> Download .xlsx
                </Button>
            </div>

            {/* Invoice Content */}
            <div id="invoice-content" className="invoice-content bg-white p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-widest mb-1">{t('title')}</h1>
                    <div className="text-sm text-muted-foreground">Invoice #INV-{booking.id.substring(0, 6)}</div>
                </div>

                <div className="flex justify-between mb-8">
                    <div>
                        <div className="font-bold text-lg mb-2">Billed To:</div>
                        <div>{billedToName} 様</div>
                        {booking.customers?.email && <div>{booking.customers.email}</div>}
                        {booking.agency_tel && <div>{booking.agency_tel}</div>}
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-lg mb-2">Merchant:</div>
                        <div>Yoshiya - {restaurantId.toUpperCase()}</div>
                    </div>
                </div>

                <div className="mb-4 font-medium">
                    Booking Date: {booking.date} {booking.start_time} ({booking.party_size} Pax)
                </div>

                <table className="w-full mb-8">
                    <thead className="border-b">
                        <tr>
                            <th className="text-left py-2">Description</th>
                            <th className="text-center py-2">Qty</th>
                            <th className="text-right py-2">Price</th>
                            <th className="text-right py-2">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id} className="border-b">
                                <td className="py-2">{item.description}</td>
                                <td className="text-center py-2">{item.quantity}</td>
                                <td className="text-right py-2">¥{item.price.toLocaleString()}</td>
                                <td className="text-right py-2">¥{item.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between">
                            <span>{t('subtotal')}</span>
                            <span>¥{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t('tax')}</span>
                            <span>¥{tax.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>{t('total')}</span>
                            <span>¥{total.toLocaleString()}</span>
                        </div>
                        {deposit > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                                <span>{t('depositPaid')}</span>
                                <span>-¥{deposit.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-xl border-t pt-2 mt-2">
                            <span>{t('balanceDue')}</span>
                            <span>¥{balance.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
        @media print {
            .no-print { display: none !important; }
            body { background: white; }
            .sidebar { display: none; } /* Assuming sidebar class or header id */
            header { display: none; }
            .invoice-content { 
                width: 100%; 
                margin: 0; 
                padding: 0;
            }
        }
      `}</style>
        </div>
    )
}
