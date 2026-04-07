"use client"

import { useRef, useState } from "react"
import { MoreHorizontal, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { createMenuTag, deleteMenuTag, renameMenuTag } from "@/lib/actions/menu-tags"
import type { MenuTagWithCount } from "@/lib/queries/menu-tags"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
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
    DropdownMenuSeparator,
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

interface MenuTagsTableProps {
    data: MenuTagWithCount[]
}

export function MenuTagsTable({ data }: MenuTagsTableProps) {
    const router = useRouter()
    const t = useTranslations("settings.menuTags")
    const [addValue, setAddValue] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState("")
    const [deleteTarget, setDeleteTarget] = useState<MenuTagWithCount | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const editInputRef = useRef<HTMLInputElement>(null)

    const handleAdd = async () => {
        const label = addValue.trim()
        if (!label) return
        setIsAdding(true)
        try {
            const result = await createMenuTag(label)
            if (result.error) throw new Error(result.error)
            setAddValue("")
            router.refresh()
            toast.success(t("addSuccess"))
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : t("addFailed"))
        } finally {
            setIsAdding(false)
        }
    }

    const startEdit = (tag: MenuTagWithCount) => {
        setEditingId(tag.id)
        setEditValue(tag.label)
        setTimeout(() => editInputRef.current?.focus(), 0)
    }

    const commitEdit = async (tagId: string) => {
        const label = editValue.trim()
        setEditingId(null)
        if (!label) return
        const original = data.find((t) => t.id === tagId)
        if (original && label === original.label) return
        try {
            const result = await renameMenuTag(tagId, label)
            if (result.error) throw new Error(result.error)
            router.refresh()
            toast.success(t("renameSuccess"))
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : t("renameFailed"))
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            const result = await deleteMenuTag(deleteTarget.id)
            if (result.error) throw new Error(result.error)
            setDeleteTarget(null)
            router.refresh()
            toast.success(t("deleteSuccess"))
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : t("deleteFailed"))
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-medium">{t("title")}</h2>
                <p className="text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <div className="flex gap-2">
                <Input
                    placeholder={t("addPlaceholder")}
                    value={addValue}
                    onChange={(e) => setAddValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleAdd() }}
                    disabled={isAdding}
                    className="flex-1"
                />
                <Button
                    onClick={() => void handleAdd()}
                    disabled={isAdding || !addValue.trim()}
                    size="sm"
                >
                    <Plus className="mr-1 h-4 w-4" />
                    {t("addButton")}
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("columnLabel")}</TableHead>
                            <TableHead className="w-24 text-right">{t("columnMenuCount")}</TableHead>
                            <TableHead className="w-[70px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((tag) => (
                            <TableRow key={tag.id}>
                                <TableCell>
                                    {editingId === tag.id ? (
                                        <Input
                                            ref={editInputRef}
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => void commitEdit(tag.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") void commitEdit(tag.id)
                                                if (e.key === "Escape") setEditingId(null)
                                            }}
                                            className="h-7 max-w-xs"
                                        />
                                    ) : (
                                        <span
                                            className="cursor-pointer rounded px-1 hover:bg-muted"
                                            onClick={() => startEdit(tag)}
                                        >
                                            {tag.label}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {tag.menu_count === 0 ? (
                                        <span className="tabular-nums text-muted-foreground">0</span>
                                    ) : (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="tabular-nums text-foreground underline-offset-4 hover:underline cursor-pointer">
                                                    {tag.menu_count}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent align="end" className="w-56 p-0">
                                                <ul className="max-h-48 overflow-y-auto py-1">
                                                    {tag.menus.map((menu) => (
                                                        <li key={menu.id} className="px-3 py-1.5 text-sm">
                                                            {menu.name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                                            <DropdownMenuItem onClick={() => startEdit(tag)}>
                                                {t("renameAction")}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => setDeleteTarget(tag)}
                                            >
                                                {t("deleteAction")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
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
                            {t("deleteConfirmBody", { label: deleteTarget?.label ?? "", count: deleteTarget?.menu_count ?? 0 })}
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
