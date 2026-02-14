"use client"

import { useState } from "react"
import { MoreHorizontal, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { AddStaffDialog, EditStaffDialog, RemoveStaffDialog } from "./staff-dialogs"
import { toggleAssignable } from "@/lib/actions/staff"
import { Badge } from "@/components/ui/badge"

interface Staff {
    id: string
    name: string
    role: string
    email: string | null
    is_assignable: boolean
    deleted_at: string | null // Should be filtered out but good to have type
}

interface StaffTableProps {
    data: Staff[]
}

export function StaffTable({ data }: StaffTableProps) {
    const [editStaff, setEditStaff] = useState<Staff | null>(null)
    const [removeStaff, setRemoveStaff] = useState<Staff | null>(null)

    const handleToggle = async (userId: string, currentState: boolean) => {
        // Optimistic update could be handled here or via useOptimistic hook.
        // For simplicity, rely on server action revalidation.
        // We could assume success and not wait, but toggle usually expects feedback.
        // But Switch component state is controlled or uncontrolled?
        // If controlled by `is_assignable`, it will flick back until revalidation.
        // Shadcn Switch is controlled if `checked` prop is passed.
        // We rely on `data` prop which comes from server component.
        // So we need `useOptimistic` to override it instantly.
    }

    // Since `useOptimistic` is tricky with complex objects array, I'll rely on fast server action 
    // or just local state override if needed.
    // For now simple await. The UI might lag slightly.

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">スタッフー覧</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage staff accounts and assignment visibility.
                    </p>
                </div>
                <AddStaffDialog />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>名前</TableHead>
                            <TableHead>ユーザー名</TableHead>
                            <TableHead>配役に表示</TableHead>
                            <TableHead className="w-[70px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((staff) => {
                            const username = staff.email ? staff.email.split('@')[0] : '-'
                            return (
                                <TableRow key={staff.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{staff.name}</span>
                                            <span className="text-xs text-muted-foreground md:hidden">{username}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{username}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={staff.is_assignable}
                                                onCheckedChange={async (checked) => {
                                                    // Optimistic UI handled by server revalidation
                                                    // But to avoid flicker, we might want local state.
                                                    // Actually, checked state comes from `staff.is_assignable`.
                                                    // Unless we useOptimistic, it will revert until server responses.
                                                    // I'll wrap in transition?
                                                    // Or just accept simple implementation for now.
                                                    try {
                                                        await toggleAssignable(staff.id, checked)
                                                        toast.success(checked ? "Visible in assignments" : "Hidden from assignments")
                                                    } catch (e) {
                                                        toast.error("Failed to update")
                                                    }
                                                }}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {staff.is_assignable ? "ON" : "OFF"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setEditStaff(staff)}>
                                                    Reference/Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => setRemoveStaff(staff)}
                                                >
                                                    Remove
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No staff found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {editStaff && (
                <EditStaffDialog
                    open={!!editStaff}
                    onOpenChange={(open) => !open && setEditStaff(null)}
                    staff={editStaff}
                />
            )}

            {removeStaff && (
                <RemoveStaffDialog
                    open={!!removeStaff}
                    onOpenChange={(open) => !open && setRemoveStaff(null)}
                    staff={removeStaff}
                />
            )}
        </div>
    )
}
