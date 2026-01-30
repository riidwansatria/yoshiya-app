"use client"

import * as React from "react"
import { Printer, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { reservations, customers, menus, halls } from "@/lib/mock-data"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"

interface InvoiceViewProps {
    restaurantId: string
    bookingId: string
}


import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// ...

export function InvoiceView({ restaurantId, bookingId }: InvoiceViewProps) {
    const t = useTranslations('invoice')

    const booking = reservations.find(r => r.id === bookingId)
    if (!booking) return <div>Booking not found</div>

    const customer = customers.find(c => c.id === booking.customerId)
    const menu = menus.find(m => m.id === booking.menuId)

    const [items, setItems] = React.useState([
        { id: 1, description: menu?.name || 'Menu', quantity: booking.partySize, price: menu?.price || 0 },
        { id: 2, description: 'Service Charge', quantity: 1, price: 5000 },
    ])

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const tax = subtotal * 0.1
    const total = subtotal + tax
    const deposit = booking.status === 'deposit_paid' ? 10000 : 0
    const balance = total - deposit

    const handlePrint = () => window.print()

    const handleDownloadPDF = async () => {
        const element = document.getElementById('invoice-content')
        if (!element) return

        try {
            const canvas = await html2canvas(element, { scale: 2 })
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(`invoice-${booking.id}.pdf`)
        } catch (error) {
            console.error('PDF generation failed', error)
        }
    }

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 min-h-screen">
            {/* Header Actions */}
            <div className="flex justify-end gap-2 mb-8 no-print">
                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button onClick={handleDownloadPDF}>
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
            </div>

            {/* Invoice Content */}
            <div id="invoice-content" className="invoice-content bg-white p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold tracking-widest mb-1">{t('title')}</h1>
                    <div className="text-sm text-muted-foreground">Invoice #INV-{booking.id.padStart(6, '0')}</div>
                </div>

                <div className="flex justify-between mb-8">
                    <div>
                        <div className="font-bold text-lg mb-2">Billed To:</div>
                        <div>{customer?.name} 様</div>
                        <div>{customer?.email}</div>
                        <div>{customer?.phone}</div>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-lg mb-2">Merchant:</div>
                        <div>Yoshiya - {restaurantId.toUpperCase()}</div>
                        <div>123 Restaurant St.</div>
                        <div>Tokyo, Japan</div>
                    </div>
                </div>

                <div className="mb-4 font-medium">
                    Booking Date: {booking.date} {booking.startTime} ({booking.partySize} Pax)
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
                                <td className="text-right py-2">¥{(item.quantity * item.price).toLocaleString()}</td>
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

