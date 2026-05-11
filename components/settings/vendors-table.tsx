"use client"

import { useEffect, useRef, useState } from "react"
import { MoreHorizontal, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { createVendor, deleteVendor, updateVendor } from "@/lib/actions/vendors"
import type { Vendor } from "@/lib/queries/vendors"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface VendorsTableProps {
    data: Vendor[]
}

type EditableField = 'name' | 'email' | 'tel' | 'fax'

interface EditState {
    id: string
    field: EditableField
    value: string
}

interface AddState {
    name: string
    email: string
    tel: string
    fax: string
}

export function VendorsTable({ data }: VendorsTableProps) {
    const router = useRouter()
    const t = useTranslations("settings.vendors")
    const [localData, setLocalData] = useState<Vendor[]>(data)
    const [editState, setEditState] = useState<EditState | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [addState, setAddState] = useState<AddState>({ name: '', email: '', tel: '', fax: '' })
    const editInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { setLocalData(data) }, [data])

    const startEdit = (vendor: Vendor, field: EditableField) => {
        setEditState({ id: vendor.id, field, value: vendor[field] ?? '' })
        setTimeout(() => editInputRef.current?.focus(), 0)
    }

    const commitEdit = async (vendorId: string) => {
        if (!editState) return
        const { field, value } = editState
        setEditState(null)

        const original = localData.find((v) => v.id === vendorId)
        if (!original) return

        const normalized = value.trim() || null
        if (normalized === (original[field] ?? null)) return

        if (field === 'name' && !normalized) return

        setLocalData((prev) =>
            prev.map((v) => v.id === vendorId ? { ...v, [field]: normalized } : v)
        )

        const result = await updateVendor(vendorId, { [field]: normalized })
        if (result.error) {
            setLocalData(data)
            toast.error(result.error)
        } else {
            router.refresh()
            toast.success(t("updateSuccess"))
        }
    }

    const handleAdd = async () => {
        const name = addState.name.trim()
        if (!name) return

        setIsAdding(true)
        try {
            const result = await createVendor({
                name,
                email: addState.email.trim() || null,
                tel: addState.tel.trim() || null,
                fax: addState.fax.trim() || null,
            })
            if (result.error) throw new Error(result.error)
            if (result.data) {
                setLocalData((prev) => [...prev, result.data as Vendor])
            }
            setAddState({ name: '', email: '', tel: '', fax: '' })
            router.refresh()
            toast.success(t("addSuccess"))
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : t("addFailed"))
        } finally {
            setIsAdding(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            const result = await deleteVendor(deleteTarget.id)
            if (result.error) throw new Error(result.error)
            setLocalData((prev) => prev.filter((v) => v.id !== deleteTarget.id))
            setDeleteTarget(null)
            router.refresh()
            toast.success(t("deleteSuccess"))
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : t("deleteFailed"))
        } finally {
            setIsDeleting(false)
        }
    }

    const editableCell = (vendor: Vendor, field: EditableField) => {
        const isEditing = editState?.id === vendor.id && editState.field === field
        const value = vendor[field]
        if (isEditing) {
            return (
                <Input
                    ref={editInputRef}
                    value={editState.value}
                    onChange={(e) => setEditState((s) => s ? { ...s, value: e.target.value } : null)}
                    onBlur={() => void commitEdit(vendor.id)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") void commitEdit(vendor.id)
                        if (e.key === "Escape") setEditState(null)
                    }}
                    className="h-7"
                />
            )
        }
        return (
            <span
                className="cursor-pointer rounded px-1 hover:bg-muted"
                onClick={() => startEdit(vendor, field)}
            >
                {value ?? <span className="italic opacity-40">—</span>}
            </span>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-medium">{t("title")}</h2>
                <p className="text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("columnName")}</TableHead>
                            <TableHead>{t("columnEmail")}</TableHead>
                            <TableHead>{t("columnTel")}</TableHead>
                            <TableHead>{t("columnFax")}</TableHead>
                            <TableHead className="w-[70px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {localData.map((vendor) => (
                            <TableRow key={vendor.id}>
                                <TableCell className="font-medium">{editableCell(vendor, 'name')}</TableCell>
                                <TableCell>{editableCell(vendor, 'email')}</TableCell>
                                <TableCell>{editableCell(vendor, 'tel')}</TableCell>
                                <TableCell>{editableCell(vendor, 'fax')}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">{t("openMenu")}</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => setDeleteTarget(vendor)}
                                            >
                                                {t("deleteAction")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}

                        <TableRow>
                            <TableCell>
                                <Input
                                    placeholder={t("addName")}
                                    value={addState.name}
                                    onChange={(e) => setAddState((s) => ({ ...s, name: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === "Enter") void handleAdd() }}
                                    disabled={isAdding}
                                    className="h-7"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    placeholder={t("addEmail")}
                                    value={addState.email}
                                    onChange={(e) => setAddState((s) => ({ ...s, email: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === "Enter") void handleAdd() }}
                                    disabled={isAdding}
                                    className="h-7"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    placeholder={t("addTel")}
                                    value={addState.tel}
                                    onChange={(e) => setAddState((s) => ({ ...s, tel: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === "Enter") void handleAdd() }}
                                    disabled={isAdding}
                                    className="h-7"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    placeholder={t("addFax")}
                                    value={addState.fax}
                                    onChange={(e) => setAddState((s) => ({ ...s, fax: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === "Enter") void handleAdd() }}
                                    disabled={isAdding}
                                    className="h-7"
                                />
                            </TableCell>
                            <TableCell>
                                <Button
                                    onClick={() => void handleAdd()}
                                    disabled={isAdding || !addState.name.trim()}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>

                        {localData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-10 text-center text-muted-foreground text-sm">
                                    {t("emptyState")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("deleteConfirmBody", { name: deleteTarget?.name ?? "" })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                            {t("cancel")}
                        </Button>
                        <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
                            {t("deleteAction")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
