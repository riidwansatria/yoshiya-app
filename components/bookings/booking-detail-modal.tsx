"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Printer, Mail, User, FileText, CalendarIcon, ChevronDown, DoorOpen, Users, NotepadText, Utensils, Contact, Clock, FileClock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { reservations, customers, halls, menus } from "@/lib/mock-data"
import { useTranslations } from "next-intl"

interface BookingDetailModalProps {
    bookingId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    restaurantId: string
}

export function BookingDetailModal({ bookingId, open, onOpenChange, restaurantId }: BookingDetailModalProps) {
    const t = useTranslations()
    const router = useRouter()
    const booking = reservations.find(r => r.id === bookingId)

    const customer = customers.find(c => c.id === booking?.customerId)
    const hall = halls.find(h => h.id === booking?.hallId)
    const selectedMenu = menus.find(m => m.id === booking?.menuId)
    const [status, setStatus] = React.useState(booking?.status || 'pending')
    const [notes, setNotes] = React.useState(booking?.serviceNotes || '')

    React.useEffect(() => {
        if (booking) {
            setStatus(booking.status)
            setNotes(booking.serviceNotes || '')
        }
    }, [booking])

    if (!booking) return null

    const handleInvoice = () => {
        router.push(`/dashboard/${restaurantId}/bookings/${bookingId}/invoice`)
        onOpenChange(false)
    }

    const totalAmount = selectedMenu ? selectedMenu.price * booking.partySize : 0
    const formattedDate = format(new Date(booking.date), "yyyy/MM/dd")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="sm:max-w-5xl overflow-hidden bg-background p-0 flex flex-col max-h-[85vh] gap-0">

                {/* Header */}
                <header className="px-4 py-3 border-b flex justify-between items-center">
                    <div>
                        <DialogTitle className="text-xl font-semibold">{t('bookingModal.title')}</DialogTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">#{booking.id.toUpperCase()}</p>
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className={cn(
                            "h-7 shadow-none px-3 text-xs font-medium focus:ring-0 gap-2 rounded-full border pointer-events-auto",
                            status === 'confirmed' ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" :
                                status === 'cancelled' ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100" :
                                    "bg-muted/60 border-border text-muted-foreground hover:bg-muted"
                        )}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                            <SelectItem value="pending">
                                <span className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-muted-foreground"></span>
                                    Pending
                                </span>
                            </SelectItem>
                            <SelectItem value="confirmed">
                                <span className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                    Confirmed
                                </span>
                            </SelectItem>
                            <SelectItem value="cancelled">
                                <span className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                    Cancelled
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </header>

                {/* Main Content */}
                <div className="p-4 flex-1 space-y-4 overflow-y-auto">

                    {/* Top Row: Arrival/Room + Client Details */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                        {/* Left Card: Arrival Schedule & Room */}
                        <div className="md:col-span-4 border rounded-lg p-3 space-y-3 bg-white">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <CalendarIcon className="w-3 h-3" />
                                    <h2 className="text-[10px] font-semibold uppercase tracking-wider">Arrival</h2>
                                </div>
                                <div className="mt-1 space-y-1">
                                    {/* Date Picker */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="flex items-center gap-2 text-2xl font-semibold hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 transition-colors group">
                                                {formattedDate}
                                                <ChevronDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                captionLayout="dropdown"
                                                selected={new Date(booking.date)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>

                                    {/* Time Range */}
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground -mx-2">
                                        <input
                                            type="time"
                                            defaultValue={booking.startTime}
                                            className="bg-transparent border-0 p-0 px-2 py-1 text-sm font-normal hover:bg-muted/50 rounded-md focus:outline-none focus:ring-0 appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                                        />
                                        <span className="text-muted-foreground/60">→</span>
                                        <input
                                            type="time"
                                            defaultValue={booking.endTime}
                                            className="bg-transparent border-0 p-0 px-2 py-1 text-sm font-normal hover:bg-muted/50 rounded-md focus:outline-none focus:ring-0 appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-border/50" />

                            <div className="space-y-4 pt-1">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <DoorOpen className="w-3 h-3" />
                                    <h2 className="text-[10px] font-semibold uppercase tracking-wider">Room</h2>
                                </div>
                                <Select defaultValue={hall?.id}>
                                    <SelectTrigger className="w-full h-12 border-input bg-muted/20 text-lg rounded-lg px-3 focus:ring-1 focus:ring-ring font-medium">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {halls.filter(h => h.restaurant === restaurantId).map(h => (
                                            <SelectItem key={h.id} value={h.id}>
                                                <div className="flex items-center justify-between w-full gap-4">
                                                    <span>{h.name}</span>
                                                    <span className="text-muted-foreground text-sm">~{h.capacity}名</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Right Card: Client Details */}
                        <div className="md:col-span-8 border rounded-lg p-3 bg-white">
                            <div className="flex items-center gap-2 text-muted-foreground mb-3">
                                <Users className="w-3 h-3" />
                                <h2 className="text-[10px] font-semibold uppercase tracking-wider">Client Details</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column: Agency Info */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Agency Name</span>
                                            <input
                                                type="text"
                                                defaultValue={booking.agencyName}
                                                className="w-full text-sm font-medium bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                                placeholder="Select Agency"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Branch</span>
                                            <input
                                                type="text"
                                                defaultValue={booking.branchName}
                                                className="w-full text-sm font-medium bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                                placeholder="Branch Name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Address</span>
                                        <input
                                            type="text"
                                            defaultValue={booking.agencyAddress}
                                            className="w-full text-sm bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                            placeholder="Agency Address"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">TEL</span>
                                            <input
                                                type="text"
                                                defaultValue={booking.agencyTel}
                                                className="w-full text-sm bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">FAX</span>
                                            <input
                                                type="text"
                                                defaultValue={booking.agencyFax}
                                                className="w-full text-sm bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Group Info & Counts */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Group Name</span>
                                        <input
                                            type="text"
                                            defaultValue={booking.groupName}
                                            className="w-full text-sm font-medium bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                            placeholder="Group Name"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">PIC</span>
                                            <input
                                                type="text"
                                                defaultValue={booking.repName}
                                                className="w-full text-sm font-medium bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                                placeholder="PIC"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Arranger (手配者)</span>
                                            <input
                                                type="text"
                                                defaultValue={booking.arrangerName}
                                                className="w-full text-sm bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                                placeholder="Arranger Name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Guests</span>
                                            <input
                                                type="number"
                                                defaultValue={booking.partySize}
                                                className="w-full text-sm font-semibold bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tour Cond.</span>
                                            <input
                                                type="number"
                                                defaultValue={booking.tourConductorCount || 0}
                                                className="w-full text-sm font-semibold bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Crew</span>
                                            <input
                                                type="number"
                                                defaultValue={booking.crewCount || 0}
                                                className="w-full text-sm font-semibold bg-muted/20 hover:bg-muted/40 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Menu Selections Table */}
                    <div className="border rounded-lg overflow-hidden bg-white">
                        <div className="p-3 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Utensils className="w-3 h-3" />
                                <h2 className="text-[10px] font-semibold uppercase tracking-wider">Menu Selections</h2>
                            </div>
                            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-auto py-0.5 px-2 text-[10px]">
                                + Add Item
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/3">Item</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/4">Remarks</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qty</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    <tr className="group hover:bg-muted/30 transition-colors">
                                        <td className="py-4 px-4 align-top">
                                            <div className="font-medium text-base">{selectedMenu?.name || 'No menu'}</div>
                                            <div className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-sm">{selectedMenu?.description || 'Standard course menu'}</div>
                                        </td>
                                        <td className="py-4 px-4 align-top">
                                            <div className="text-muted-foreground text-sm lowercase italic">—</div>
                                        </td>
                                        <td className="py-4 px-4 text-right align-top">
                                            <div className="font-mono text-sm text-muted-foreground">¥{selectedMenu?.price.toLocaleString() || 0}</div>
                                        </td>
                                        <td className="py-4 px-4 text-center align-top">
                                            <div className="inline-flex items-center justify-center bg-muted/60 text-foreground text-sm font-medium px-2.5 py-0.5 rounded-md min-w-[2rem]">
                                                {booking.partySize}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-right align-top">
                                            <div className="font-mono font-medium">¥{totalAmount.toLocaleString()}</div>
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot className="bg-muted/20 border-t">
                                    <tr>
                                        <td colSpan={4} className="py-4 px-4 text-right text-sm font-medium text-muted-foreground">Total Estimate</td>
                                        <td className="py-4 px-4 text-right text-lg font-bold font-mono">¥{totalAmount.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Section: Contact */}


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[200px]">
                        {/* Left Col: Notes */}
                        <div className="border rounded-lg p-3 bg-white space-y-3 flex flex-col">
                            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                                <NotepadText className="w-3 h-3" />
                                <h2 className="text-[10px] font-semibold uppercase tracking-wider">Service Notes</h2>
                            </div>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="flex-1 bg-muted/30 border-border/50 resize-none text-xs leading-relaxed focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Add service notes..."
                            />
                        </div>

                        <div className="border rounded-lg p-3 bg-white space-y-3 flex flex-col">
                            <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                                <FileClock className="w-3 h-3" />
                                <h2 className="text-[10px] font-semibold uppercase tracking-wider">Booking History</h2>
                            </div>

                            <div className="space-y-4 flex-1 overflow-y-auto">
                                {/* Created At */}
                                <div className="flex gap-3 relative pb-4">
                                    <div className="absolute left-[5px] top-2 h-full w-[1px] bg-border/50 last:hidden"></div>
                                    <div className="h-2.5 w-2.5 rounded-full bg-blue-100 border border-blue-200 shrink-0 relative z-10 mt-0.5"></div>
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-medium">Created</div>
                                        <div className="text-[10px] text-muted-foreground">{booking.createdAt && format(new Date(booking.createdAt), "yyyy/MM/dd HH:mm")}</div>
                                    </div>
                                </div>

                                {/* Confirmed */}
                                {booking.confirmedAt && (
                                    <div className="flex gap-3 relative pb-4">
                                        <div className="absolute left-[5px] top-2 h-full w-[1px] bg-border/50 last:hidden"></div>
                                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-100 border border-emerald-200 shrink-0 relative z-10 mt-0.5"></div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-medium flex items-center gap-1.5">
                                                Confirmed <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-[9px] text-emerald-700 font-normal border border-emerald-100">by {booking.confirmedBy}</span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">{format(new Date(booking.confirmedAt), "yyyy/MM/dd HH:mm")}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Cancelled */}
                                {(booking.status === 'cancelled' || booking.cancelledAt) && (
                                    <div className="flex gap-3 relative pb-4">
                                        <div className="absolute left-[5px] top-2 h-full w-[1px] bg-border/50 last:hidden"></div>
                                        <div className="h-2.5 w-2.5 rounded-full bg-red-100 border border-red-200 shrink-0 relative z-10 mt-0.5"></div>
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-medium flex items-center gap-1.5 text-red-600">
                                                Cancelled {booking.cancelledBy && <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-[9px] text-red-700 font-normal border border-red-100">by {booking.cancelledBy}</span>}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {booking.cancelledAt ? format(new Date(booking.cancelledAt), "yyyy/MM/dd HH:mm") : format(new Date(), "yyyy/MM/dd HH:mm")}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Last Edited */}
                                <div className="flex gap-3 relative">
                                    <div className="h-2.5 w-2.5 rounded-full bg-muted border border-border shrink-0 relative z-10 mt-0.5"></div>
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-medium">Last Edited</div>
                                        <div className="text-[10px] text-muted-foreground">{booking.lastEditedAt && format(new Date(booking.lastEditedAt), "yyyy/MM/dd HH:mm")}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="px-6 py-4 border-t flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={handleInvoice}>
                        <Printer className="mr-1.5 h-4 w-4" /> {t('bookingModal.viewInvoice')}
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t('bookingModal.cancel')}</Button>
                        <Button size="sm" onClick={() => onOpenChange(false)}>{t('bookingModal.save')}</Button>
                    </div>
                </footer>

            </DialogContent>
        </Dialog>
    )
}
