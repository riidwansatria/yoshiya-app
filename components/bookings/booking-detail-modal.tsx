"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format, parse, differenceInMinutes } from "date-fns"
import { ja } from "date-fns/locale"
import { Printer, Mail, User, FileText, CalendarIcon, ChevronDown, DoorOpen, Users, NotepadText, Utensils, Contact, Clock, FileClock, RotateCcw, PanelRight, UserCog } from "lucide-react"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getBookingDetails, updateBooking, getStaffList, getVenueList, deleteBooking } from "@/lib/actions/bookings"
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
    const [booking, setBooking] = React.useState<any>(null)
    const [loading, setLoading] = React.useState(false)

    // UI and Form State
    const [status, setStatus] = React.useState('pending')
    const [notes, setNotes] = React.useState('')
    const [showStaffSidebar, setShowStaffSidebar] = React.useState(true)

    // Staff Assignment State
    const [prepStaffIds, setPrepStaffIds] = React.useState<string[]>([])
    const [serviceStaffIds, setServiceStaffIds] = React.useState<string[]>([])
    const [cleaningStaffIds, setCleaningStaffIds] = React.useState<string[]>([])

    // Booking Details State
    const [date, setDate] = React.useState<Date | undefined>(undefined)
    const [startTime, setStartTime] = React.useState('')
    const [endTime, setEndTime] = React.useState('')
    const [venueId, setVenueId] = React.useState('')

    // Agency & Group State
    const [agencyName, setAgencyName] = React.useState('')
    const [branchName, setBranchName] = React.useState('')
    const [agencyAddress, setAgencyAddress] = React.useState('')
    const [agencyTel, setAgencyTel] = React.useState('')
    const [agencyFax, setAgencyFax] = React.useState('')
    const [groupName, setGroupName] = React.useState('')
    const [repName, setRepName] = React.useState('')
    const [arrangerName, setArrangerName] = React.useState('')

    // Counts State
    const [partySize, setPartySize] = React.useState(0)
    const [conductorCount, setConductorCount] = React.useState(0)
    const [crewCount, setCrewCount] = React.useState(0)
    const [prepDuration, setPrepDuration] = React.useState(30)

    const [cleaningDuration, setCleaningDuration] = React.useState(30)

    const [saving, setSaving] = React.useState(false)
    const [staffList, setStaffList] = React.useState<{ id: string, name: string, role: string }[]>([])
    const [venueList, setVenueList] = React.useState<{ id: string, name: string, capacity: number }[]>([])

    // ... (Effect hooks remain, will update loadBooking in next step) ...

    const StaffSelector = ({
        title,
        selectedIds,
        setIds,
        duration,
        setDuration,
        icon: Icon
    }: {
        title: string,
        selectedIds: string[],
        setIds: (ids: string[]) => void,
        duration?: number,
        setDuration?: (d: number) => void,
        icon: any
    }) => (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="w-3 h-3" />
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider">{title}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                    {duration !== undefined && setDuration && (
                        <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v))}>
                            <SelectTrigger className="h-5 w-auto gap-0.5 px-1.5 text-[10px] border-none shadow-none bg-transparent text-muted-foreground hover:text-foreground focus:ring-0 cursor-pointer">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end" className="min-w-0">
                                {[5, 10, 15, 20, 30, 45, 60].map(v => (
                                    <SelectItem key={v} value={String(v)} className="text-xs">{v} min</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full border">
                        {selectedIds.length}
                    </span>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                {staffList.map(member => {
                    const isSelected = selectedIds.includes(member.id)
                    return (
                        <Button
                            key={member.id}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleStaff(member.id, selectedIds, setIds)}
                            className={cn(
                                "h-7 px-3 text-xs border",
                                isSelected
                                    ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                                    : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                            )}
                        >
                            {member.name}
                        </Button>
                    )
                })}
            </div>
        </div>
    )

    // Load booking data
    React.useEffect(() => {
        async function loadBooking() {
            if (!bookingId || !open) return

            setLoading(true)
            try {
                const [bookingResult, staffResult, venueResult] = await Promise.all([
                    getBookingDetails(bookingId),
                    getStaffList(),
                    getVenueList(restaurantId)
                ])

                if (staffResult.success && staffResult.data) {
                    setStaffList(staffResult.data)
                }

                if (venueResult.success && venueResult.data) {
                    setVenueList(venueResult.data)
                }

                if (bookingResult.success && bookingResult.data) {
                    setBooking(bookingResult.data)
                    // Initialize form state
                    setStatus(bookingResult.data.status)
                    setNotes(bookingResult.data.notes || '')

                    // Booking Details
                    setDate(bookingResult.data.date ? new Date(bookingResult.data.date) : undefined)
                    setStartTime(bookingResult.data.start_time || '')
                    setEndTime(bookingResult.data.end_time || '')
                    setVenueId(bookingResult.data.venue_id || '')

                    // Agency & Group Info
                    setAgencyName(bookingResult.data.agency_name || '')
                    setBranchName(bookingResult.data.agency_branch || '')
                    setAgencyAddress(bookingResult.data.agency_address || '')
                    setAgencyTel(bookingResult.data.agency_tel || '')
                    setAgencyFax(bookingResult.data.agency_fax || '')
                    setGroupName(bookingResult.data.group_name || '')
                    setRepName(bookingResult.data.rep_name || '')
                    setArrangerName(bookingResult.data.arranger_name || '')

                    // Counts
                    setPartySize(bookingResult.data.party_size || 0)
                    setConductorCount(bookingResult.data.conductor_count || 0)
                    setCrewCount(bookingResult.data.crew_count || 0)

                    // Parse staff assignments
                    const prepStaff = bookingResult.data.reservation_staff?.filter((s: any) => s.role === 'prep') || []
                    const serviceStaff = bookingResult.data.reservation_staff?.filter((s: any) => s.role === 'service') || []
                    const cleaningStaff = bookingResult.data.reservation_staff?.filter((s: any) => s.role === 'cleaning') || []

                    setPrepStaffIds(prepStaff.map((s: any) => s.user_id))
                    setServiceStaffIds(serviceStaff.map((s: any) => s.user_id))
                    setCleaningStaffIds(cleaningStaff.map((s: any) => s.user_id))

                    if (prepStaff.length > 0) setPrepDuration(prepStaff[0].duration_minutes || 30)
                    if (cleaningStaff.length > 0) setCleaningDuration(cleaningStaff[0].duration_minutes || 30)
                }
            } catch (error) {
                console.error('Failed to load booking:', error)
            } finally {
                setLoading(false)
            }
        }

        loadBooking()
    }, [bookingId, open])

    // Reset when closed
    React.useEffect(() => {
        if (!open) {
            setBooking(null)
            setLoading(false)
            // Reset form state
            setStatus('pending')
            setNotes('')
            setDate(undefined)
            setStartTime('')
            setEndTime('')
            setVenueId('')
            setAgencyName('')
            setBranchName('')
            setAgencyAddress('')
            setAgencyTel('')
            setAgencyFax('')
            setGroupName('')
            setRepName('')
            setArrangerName('')
            setPartySize(0)
            setConductorCount(0)
            setCrewCount(0)
            setPrepStaffIds([])
            setServiceStaffIds([])
            setCleaningStaffIds([])
            setPrepDuration(30)
            setCleaningDuration(30)
        }
    }, [open])

    if (!open) return null
    if (loading) return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="max-w-[95vw] sm:max-w-7xl overflow-hidden bg-background p-0 flex flex-col max-h-[90vh] gap-0">
                <DialogTitle className="sr-only">Loading booking details</DialogTitle>
                {/* Skeleton Header */}
                <header className="px-4 py-3 border-b flex justify-between items-center bg-white z-10">
                    <div>
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-3 w-28 mt-1.5" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-7 w-24 rounded-full" />
                        <div className="w-px h-6 bg-border mx-1" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/30">
                        <div className="p-4 space-y-4">
                            {/* Top Row: Date/Room + Client Details */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                {/* Left Card: Arrival & Room */}
                                <div className="md:col-span-4 border rounded-lg p-3 space-y-3 bg-white shadow-sm">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-8 w-36" />
                                    <Skeleton className="h-4 w-28" />
                                    <hr className="border-border/50" />
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-12 w-full rounded-lg" />
                                </div>
                                {/* Right Card: Client Details */}
                                <div className="md:col-span-8 border rounded-lg p-3 bg-white shadow-sm">
                                    <Skeleton className="h-3 w-28 mb-3" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1"><Skeleton className="h-3 w-16" /><Skeleton className="h-8 w-full" /></div>
                                                <div className="space-y-1"><Skeleton className="h-3 w-12" /><Skeleton className="h-8 w-full" /></div>
                                            </div>
                                            <div className="space-y-1"><Skeleton className="h-3 w-14" /><Skeleton className="h-8 w-full" /></div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1"><Skeleton className="h-3 w-10" /><Skeleton className="h-8 w-full" /></div>
                                                <div className="space-y-1"><Skeleton className="h-3 w-10" /><Skeleton className="h-8 w-full" /></div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="space-y-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-full" /></div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1"><Skeleton className="h-3 w-12" /><Skeleton className="h-8 w-full" /></div>
                                                <div className="space-y-1"><Skeleton className="h-3 w-14" /><Skeleton className="h-8 w-full" /></div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1"><Skeleton className="h-3 w-10" /><Skeleton className="h-8 w-full" /></div>
                                                <div className="space-y-1"><Skeleton className="h-3 w-10" /><Skeleton className="h-8 w-full" /></div>
                                                <div className="space-y-1"><Skeleton className="h-3 w-10" /><Skeleton className="h-8 w-full" /></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Table Skeleton */}
                            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                <div className="p-3 flex justify-between items-center bg-gray-50/50">
                                    <Skeleton className="h-3 w-28" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                                <div className="px-4 py-3 space-y-3">
                                    <div className="flex justify-between items-center border-b pb-2">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-3 w-12" />
                                        <Skeleton className="h-3 w-8" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                    <div className="flex justify-between items-start py-2">
                                        <div className="space-y-1.5"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-48" /></div>
                                        <Skeleton className="h-4 w-8" />
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-6 w-10 rounded-md" />
                                        <Skeleton className="h-5 w-20" />
                                    </div>
                                    <div className="flex justify-end items-center border-t pt-3">
                                        <Skeleton className="h-6 w-28" />
                                    </div>
                                </div>
                            </div>

                            {/* Bottom: Notes + History */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[200px]">
                                <div className="border rounded-lg p-3 bg-white space-y-3 shadow-sm">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="h-24 w-full rounded-md" />
                                </div>
                                <div className="border rounded-lg p-3 bg-white space-y-3 shadow-sm">
                                    <Skeleton className="h-3 w-28" />
                                    <div className="space-y-3">
                                        <div className="flex gap-3"><Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" /><div className="space-y-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-2.5 w-28" /></div></div>
                                        <div className="flex gap-3"><Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" /><div className="space-y-1"><Skeleton className="h-3 w-16" /><Skeleton className="h-2.5 w-28" /></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Skeleton Footer */}
                <footer className="px-6 py-4 border-t flex items-center justify-between bg-white z-10">
                    <Skeleton className="h-8 w-32" />
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                </footer>
            </DialogContent>
        </Dialog>
    )
    if (!booking) return null

    const customerName = booking.customers?.name || 'Unknown'
    const hallName = booking.venues?.name || 'Unknown'
    const hallCapacity = booking.venues?.capacity || 0

    // We assume mostly one menu per booking for now in the main view, 
    // but the DB supports multiple. We'll take the first one for the summary.
    const primaryMenu = booking.reservation_menus?.[0]
    const menuName = primaryMenu?.menu_name
    const unitPrice = primaryMenu?.unit_price || 0

    // Calculate total from all menu items
    const totalAmount = booking.reservation_menus?.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0) || 0

    // Format dates
    const formattedDate = date ? format(date, 'yyyy年M月d日 (EEE)', { locale: ja }) : ''
    const handleInvoice = () => {
        router.push(`/dashboard/${restaurantId}/bookings/${bookingId}/invoice`)
        onOpenChange(false)
    }

    const handleSave = async () => {
        if (!booking) return
        setSaving(true)
        try {
            const { updateBooking } = await import('@/lib/actions/bookings')
            const result = await updateBooking(
                booking.id,
                {
                    status,
                    notes,
                    date: date ? format(date, 'yyyy-MM-dd') : undefined,
                    start_time: startTime,
                    end_time: endTime,
                    venue_id: venueId,
                    group_name: groupName,
                    party_size: partySize,
                    rep_name: repName,
                    arranger_name: arrangerName,
                    conductor_count: conductorCount,
                    crew_count: crewCount,
                    agency_name: agencyName,
                    agency_branch: branchName,
                    agency_tel: agencyTel,
                    agency_fax: agencyFax,
                    agency_address: agencyAddress,
                },
                {
                    prep: { ids: prepStaffIds, duration: prepDuration },
                    service: {
                        ids: serviceStaffIds,
                        duration: (startTime && endTime)
                            ? differenceInMinutes(parse(endTime, 'HH:mm', new Date()), parse(startTime, 'HH:mm', new Date()))
                            : 0
                    },
                    cleaning: { ids: cleaningStaffIds, duration: cleaningDuration },
                }
            )
            if (!result.success) {
                console.error('Failed to save:', result.error)
            }
        } catch (error) {
            console.error('Failed to save booking:', error)
        } finally {
            setSaving(false)
            onOpenChange(false)
            router.refresh()
        }
    }

    // Helper to toggle staff selection
    const toggleStaff = (staffId: string, currentIds: string[], setIds: (ids: string[]) => void) => {
        if (currentIds.includes(staffId)) {
            setIds(currentIds.filter(id => id !== staffId))
        } else {
            setIds([...currentIds, staffId])
        }
    }

    const handleDelete = async () => {
        if (!confirm(t('bookingModal.confirmDelete'))) return

        setSaving(true)
        try {
            const result = await deleteBooking(booking.id)
            if (result.success) {
                onOpenChange(false)
                router.refresh()
            } else {
                console.error('Failed to delete:', result.error)
                alert(t('bookingModal.errors.deleteFailed'))
            }
        } catch (error) {
            console.error('Failed to delete booking:', error)
            alert(t('bookingModal.errors.deleteFailed'))
        } finally {
            setSaving(false)
        }
    }





    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="max-w-[95vw] sm:max-w-7xl overflow-hidden bg-background p-0 flex flex-col max-h-[90vh] gap-0">

                {/* Header */}
                <header className="px-4 py-3 border-b flex justify-between items-center bg-white z-10">
                    <div>
                        <DialogTitle className="text-xl font-semibold">{t('bookingModal.title')}</DialogTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">#{booking.display_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className={cn(
                                "h-7 shadow-none px-3 text-xs font-medium focus:ring-0 gap-2 rounded-full border pointer-events-auto w-auto",
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
                                        {t('booking.status.pending')}
                                    </span>
                                </SelectItem>
                                <SelectItem value="confirmed">
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                        {t('booking.status.confirmed')}
                                    </span>
                                </SelectItem>
                                <SelectItem value="cancelled">
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                        {t('booking.status.cancelled')}
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="w-px h-6 bg-border mx-1"></div>

                        <Button
                            variant={showStaffSidebar ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => setShowStaffSidebar(!showStaffSidebar)}
                        >
                            <PanelRight className="h-4 w-4" />
                        </Button>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    {/* Main Content - Left Side */}
                    <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/30">
                        <div className="p-4 space-y-4">
                            {/* Top Row: Arrival/Room + Client Details */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

                                {/* Left Card: Arrival Schedule & Room */}
                                <div className="md:col-span-4 border rounded-lg p-3 space-y-3 bg-white shadow-sm">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <CalendarIcon className="w-3 h-3" />
                                            <h2 className="text-[10px] font-semibold uppercase tracking-wider">{t('bookingModal.arrival')}</h2>
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
                                                        selected={date}
                                                        onSelect={setDate}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>

                                            {/* Time Range */}
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground -mx-2">
                                                <input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className="bg-transparent border-0 p-0 px-2 py-1 text-sm font-normal hover:bg-muted/50 rounded-md focus:outline-none focus:ring-0 appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                                                />
                                                <span className="text-muted-foreground/60">→</span>
                                                <input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className="bg-transparent border-0 p-0 px-2 py-1 text-sm font-normal hover:bg-muted/50 rounded-md focus:outline-none focus:ring-0 appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="border-border/50" />

                                    <div className="space-y-4 pt-1">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <DoorOpen className="w-3 h-3" />
                                            <h2 className="text-[10px] font-semibold uppercase tracking-wider">{t('bookingModal.room')}</h2>
                                        </div>
                                        <Select value={venueId} onValueChange={setVenueId}>
                                            <SelectTrigger className="w-full h-12 border-input bg-muted/20 text-lg rounded-lg px-3 focus:ring-1 focus:ring-ring font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {venueList.map(h => (
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
                                <div className="md:col-span-8 border rounded-lg p-3 bg-white shadow-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                                        <Users className="w-3 h-3" />
                                        <h2 className="text-[10px] font-semibold uppercase tracking-wider">{t('bookingModal.clientDetails')}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Left Column: Agency Info */}
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.agencyName')}</span>
                                                    <Input
                                                        type="text"
                                                        value={agencyName}
                                                        onChange={(e) => setAgencyName(e.target.value)}
                                                        className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                        placeholder={t('bookingModal.placeholders.selectAgency')}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.branch')}</span>
                                                    <Input
                                                        type="text"
                                                        value={branchName}
                                                        onChange={(e) => setBranchName(e.target.value)}
                                                        className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                        placeholder={t('bookingModal.placeholders.branchName')}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.address')}</span>
                                                <Input
                                                    type="text"
                                                    value={agencyAddress}
                                                    onChange={(e) => setAgencyAddress(e.target.value)}
                                                    className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                    placeholder={t('bookingModal.placeholders.agencyAddress')}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.tel')}</span>
                                                    <Input
                                                        type="text"
                                                        value={agencyTel}
                                                        onChange={(e) => setAgencyTel(e.target.value)}
                                                        className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                        placeholder={t('bookingModal.placeholders.tel')}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.fax')}</span>
                                                    <Input
                                                        type="text"
                                                        value={agencyFax}
                                                        onChange={(e) => setAgencyFax(e.target.value)}
                                                        className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                        placeholder={t('bookingModal.placeholders.fax')}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Group Info & Counts */}
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.groupName')}</span>
                                                <Input
                                                    type="text"
                                                    value={groupName}
                                                    onChange={(e) => setGroupName(e.target.value)}
                                                    className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                    placeholder={t('bookingModal.placeholders.groupName')}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.pic')}</span>
                                                    <Input
                                                        type="text"
                                                        value={repName}
                                                        onChange={(e) => setRepName(e.target.value)}
                                                        className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                        placeholder={t('bookingModal.placeholders.pic')}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.arranger')}</span>
                                                    <Input
                                                        type="text"
                                                        value={arrangerName}
                                                        onChange={(e) => setArrangerName(e.target.value)}
                                                        className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                        placeholder={t('bookingModal.placeholders.arrangerName')}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.guests')}</span>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={partySize}
                                                        onChange={(e) => setPartySize(parseInt(e.target.value) || 0)}
                                                        className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                        placeholder={t('bookingModal.placeholders.partySize')}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.tourCond')}</span>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={conductorCount}
                                                        onChange={(e) => setConductorCount(parseInt(e.target.value) || 0)}
                                                        className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                        placeholder={t('bookingModal.placeholders.tourConductor')}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('bookingModal.crew')}</span>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={crewCount}
                                                        onChange={(e) => setCrewCount(parseInt(e.target.value) || 0)}
                                                        className="bg-muted/30 border-border/50 text-xs md:text-sm h-8"
                                                        placeholder={t('bookingModal.placeholders.crew')}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Selections Table */}
                            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                                <div className="p-3 flex justify-between items-center bg-gray-50/50">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Utensils className="w-3 h-3" />
                                        <h2 className="text-[10px] font-semibold uppercase tracking-wider">{t('bookingModal.menuSelections')}</h2>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-auto py-0.5 px-2 text-[10px]">
                                        {t('bookingModal.addItem')}
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/3">{t('bookingModal.item')}</th>
                                                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/4">{t('bookingModal.remarks')}</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('bookingModal.price')}</th>
                                                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('bookingModal.qty')}</th>
                                                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('bookingModal.tableSubtotal')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            <tr className="group hover:bg-muted/30 transition-colors">
                                                <td className="py-4 px-4 align-top">
                                                    <div className="font-medium text-base">{menuName || t('bookingModal.noMenu')}</div>
                                                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-sm">{primaryMenu?.notes || t('bookingModal.standardCourse')}</div>
                                                </td>
                                                <td className="py-4 px-4 align-top">
                                                    <div className="text-muted-foreground text-sm lowercase italic">—</div>
                                                </td>
                                                <td className="py-4 px-4 text-right align-top">
                                                    <div className="font-mono text-sm text-muted-foreground">¥{unitPrice.toLocaleString()}</div>
                                                </td>
                                                <td className="py-4 px-4 text-center align-top">
                                                    <div className="inline-flex items-center justify-center bg-muted/60 text-foreground text-sm font-medium px-2.5 py-0.5 rounded-md min-w-[2rem]">
                                                        {booking.party_size}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-right align-top">
                                                    <div className="font-mono font-medium">¥{totalAmount.toLocaleString()}</div>
                                                </td>
                                            </tr>
                                        </tbody>
                                        <tfoot className="bg-muted/20 border-t">
                                            <tr>
                                                <td colSpan={4} className="py-4 px-4 text-right text-sm font-medium text-muted-foreground">{t('bookingModal.totalEstimate')}</td>
                                                <td className="py-4 px-4 text-right text-lg font-bold font-mono">¥{totalAmount.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Bottom Section: Contact */}
                            {/* Bottom Section: Contact */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[200px]">
                                {/* Left Col: Notes */}
                                <div className="border rounded-lg p-3 bg-white space-y-3 flex flex-col shadow-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                                        <NotepadText className="w-3 h-3" />
                                        <h2 className="text-[10px] font-semibold uppercase tracking-wider">{t('bookingModal.serviceNotes')}</h2>
                                    </div>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="flex-1 bg-muted/30 border-border/50 resize-none text-xs md:text-sm leading-relaxed"
                                        placeholder={t('bookingModal.placeholders.serviceNotes')}
                                    />
                                </div>

                                <div className="border rounded-lg p-3 bg-white space-y-3 flex flex-col shadow-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                                        <FileClock className="w-3 h-3" />
                                        <h2 className="text-[10px] font-semibold uppercase tracking-wider">{t('bookingModal.bookingHistory')}</h2>
                                    </div>

                                    <div className="space-y-4 flex-1 overflow-y-auto">
                                        {/* Created At */}
                                        <div className="flex gap-3 relative pb-4">
                                            <div className="absolute left-[5px] top-2 h-full w-[1px] bg-border/50 last:hidden"></div>
                                            <div className="h-2.5 w-2.5 rounded-full bg-blue-100 border border-blue-200 shrink-0 relative z-10 mt-0.5"></div>
                                            <div className="space-y-0.5">
                                                <div className="text-xs font-medium">{t('bookingModal.history.created')}</div>
                                                <div className="text-[10px] text-muted-foreground">{booking.created_at && format(new Date(booking.created_at), "yyyy/MM/dd HH:mm")}</div>
                                            </div>
                                        </div>

                                        {/* Confirmed */}
                                        {booking.confirmed_at && (
                                            <div className="flex gap-3 relative pb-4">
                                                <div className="absolute left-[5px] top-2 h-full w-[1px] bg-border/50 last:hidden"></div>
                                                <div className="h-2.5 w-2.5 rounded-full bg-emerald-100 border border-emerald-200 shrink-0 relative z-10 mt-0.5"></div>
                                                <div className="space-y-0.5">
                                                    <div className="text-xs font-medium flex items-center gap-1.5">
                                                        {t('bookingModal.history.confirmed')} {booking.confirmed_by && <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-[9px] text-emerald-700 font-normal border border-emerald-100">{t('bookingModal.history.by', { name: booking.confirmed_by })}</span>}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">{format(new Date(booking.confirmed_at), "yyyy/MM/dd HH:mm")}</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Cancelled */}
                                        {(booking.status === 'cancelled' || booking.cancelled_at) && (
                                            <div className="flex gap-3 relative pb-4">
                                                <div className="absolute left-[5px] top-2 h-full w-[1px] bg-border/50 last:hidden"></div>
                                                <div className="h-2.5 w-2.5 rounded-full bg-red-100 border border-red-200 shrink-0 relative z-10 mt-0.5"></div>
                                                <div className="space-y-0.5">
                                                    <div className="text-xs font-medium flex items-center gap-1.5 text-red-600">
                                                        {t('bookingModal.history.cancelled')} {booking.cancelled_by && <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-[9px] text-red-700 font-normal border border-red-100">{t('bookingModal.history.by', { name: booking.cancelled_by })}</span>}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {booking.cancelled_at ? format(new Date(booking.cancelled_at), "yyyy/MM/dd HH:mm") : format(new Date(), "yyyy/MM/dd HH:mm")}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Last Edited */}
                                        <div className="flex gap-3 relative">
                                            <div className="h-2.5 w-2.5 rounded-full bg-muted border border-border shrink-0 relative z-10 mt-0.5"></div>
                                            <div className="space-y-0.5">
                                                <div className="text-xs font-medium">{t('bookingModal.history.lastEdited')}</div>
                                                <div className="text-[10px] text-muted-foreground">{booking.updated_at && format(new Date(booking.updated_at), "yyyy/MM/dd HH:mm")}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Staff Assignment Sidebar */}
                    <div className={cn(
                        "w-80 border-l bg-slate-50 flex flex-col transition-all duration-300 ease-in-out overflow-hidden shadow-inner",
                        !showStaffSidebar && "w-0 border-l-0 opacity-0"
                    )}>
                        <div className="w-80 flex flex-col h-full">
                            <div className="p-4 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex flex-col gap-3">
                                <h3 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                                    <UserCog className="w-3 h-3" />
                                    {t('bookingModal.staffAssignment')}
                                </h3>
                            </div>

                            <div className="p-4 space-y-6 overflow-y-auto flex-1">
                                {/* Prep Staff */}
                                <StaffSelector
                                    title={t('bookingModal.roles.preparation')}
                                    selectedIds={prepStaffIds}
                                    setIds={setPrepStaffIds}
                                    duration={prepDuration}
                                    setDuration={setPrepDuration}
                                    icon={Clock}
                                />

                                <div className="w-full flex justify-center"><div className="w-1 h-4 border-l-2 border-dashed border-slate-300/50"></div></div>

                                {/* Service Staff */}
                                <StaffSelector
                                    title={t('bookingModal.roles.service')}
                                    selectedIds={serviceStaffIds}
                                    setIds={setServiceStaffIds}
                                    icon={Utensils}
                                />

                                <div className="w-full flex justify-center"><div className="w-1 h-4 border-l-2 border-dashed border-slate-300/50"></div></div>

                                {/* Cleaning Staff */}
                                <StaffSelector
                                    title={t('bookingModal.roles.cleaning')}
                                    selectedIds={cleaningStaffIds}
                                    setIds={setCleaningStaffIds}
                                    duration={cleaningDuration}
                                    setDuration={setCleaningDuration}
                                    icon={RotateCcw}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="px-6 py-4 border-t flex items-center justify-between bg-white z-10">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuLabel>{t('bookingModal.actions')}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={handleInvoice}>
                                <Printer className="mr-2 h-4 w-4" />
                                {t('bookingModal.viewInvoice')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('bookingModal.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t('bookingModal.cancel')}</Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? t('bookingModal.saving') : t('bookingModal.save')}</Button>
                    </div>
                </footer>

            </DialogContent>
        </Dialog>
    )
}
