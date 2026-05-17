"use client"

import { useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { AddStaffDialog, EditStaffDialog, RemoveStaffDialog, StaffAccessDialog } from "./staff-dialogs"
import type { StaffRecord } from "./types"
import { toggleAssignable } from "@/lib/actions/staff"

const ROLE_LABELS: Record<string, string> = {
    admin: "Admin",
    owner: "Owner",
    manager: "Manager",
    staff: "Staff",
}

const MODULE_LABELS: Record<string, string> = {
    reservations: "Reservations",
    kitchen: "Kitchen",
    procurement: "Procurement",
    skewer_shop: "Skewer shop",
    menus: "Menus",
    reports: "Reports",
    staff_management: "Staff management",
    settings: "Settings",
}

interface StaffTableProps {
    data: StaffRecord[]
}

export function StaffTable({ data }: StaffTableProps) {
    const router = useRouter()
    const [editStaff, setEditStaff] = useState<StaffRecord | null>(null)
    const [accessStaff, setAccessStaff] = useState<StaffRecord | null>(null)
    const [removeStaff, setRemoveStaff] = useState<StaffRecord | null>(null)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">スタッフ一覧</h2>
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
                            <TableHead>Role</TableHead>
                            <TableHead>Modules</TableHead>
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
                                        <Badge variant={staff.role === "admin" ? "default" : "secondary"}>
                                            {ROLE_LABELS[staff.role] ?? staff.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[260px]">
                                        <div className="flex flex-wrap gap-1">
                                            {staff.modules.length > 0 ? (
                                                staff.modules.map((module) => (
                                                    <Badge key={module} variant="outline">
                                                        {MODULE_LABELS[module] ?? module}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm text-muted-foreground">None</span>
                                            )}
                                        </div>
                                    </TableCell>
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
                                                        router.refresh()
                                                        toast.success(checked ? "Visible in assignments" : "Hidden from assignments")
                                                    } catch {
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
                                                <DropdownMenuItem onClick={() => setAccessStaff(staff)}>
                                                    Permissions
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
                                <TableCell colSpan={6} className="h-24 text-center">
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

            {accessStaff && (
                <StaffAccessDialog
                    open={!!accessStaff}
                    onOpenChange={(open) => !open && setAccessStaff(null)}
                    staff={accessStaff}
                />
            )}
        </div>
    )
}
