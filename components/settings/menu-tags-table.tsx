"use client"

import { useEffect, useRef, useState } from "react"
import { MoreHorizontal, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { createMenuTag, deleteMenuTag, updateMenuTag } from "@/lib/actions/menu-tags"
import type { MenuTagKind } from "@/lib/types/kitchen"
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

interface EditState {
    id: string
    field: 'label' | 'label_en'
    value: string
}

interface AddState {
    label: string
    labelEn: string
}

function TagGroup({
    kind,
    tags,
    t,
    editState,
    editInputRef,
    onStartEdit,
    onEditChange,
    onCommitEdit,
    onCancelEdit,
    onDelete,
    onMoveKind,
    addState,
    onAddChange,
    onAdd,
    isAdding,
}: {
    kind: MenuTagKind
    tags: MenuTagWithCount[]
    t: ReturnType<typeof useTranslations<"settings.menuTags">>
    editState: EditState | null
    editInputRef: React.RefObject<HTMLInputElement | null>
    onStartEdit: (tag: MenuTagWithCount, field: 'label' | 'label_en') => void
    onEditChange: (value: string) => void
    onCommitEdit: (tagId: string) => void
    onCancelEdit: () => void
    onDelete: (tag: MenuTagWithCount) => void
    onMoveKind: (tag: MenuTagWithCount, nextKind: MenuTagKind) => void
    addState: AddState
    onAddChange: (field: 'label' | 'labelEn', value: string) => void
    onAdd: (kind: MenuTagKind) => void
    isAdding: boolean
}) {
    const sectionTitle =
        kind === 'dietary' ? t("dietarySection") :
        kind === 'ingredient' ? t("ingredientSection") :
        t("seasonSection")

    const otherKinds: { id: MenuTagKind, label: string }[] = [
        { id: 'dietary' as MenuTagKind, label: t("moveToDietary") },
        { id: 'ingredient' as MenuTagKind, label: t("moveToIngredient") },
        { id: 'season' as MenuTagKind, label: t("moveToSeason") },
    ].filter(k => k.id !== kind)

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {sectionTitle}
            </h3>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="rounded-tl-md">{t("columnLabel")}</TableHead>
                            <TableHead>{t("columnLabelEn")}</TableHead>
                            <TableHead className="w-24 text-right">{t("columnMenuCount")}</TableHead>
                            <TableHead className="w-[70px] rounded-tr-md" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tags.map((tag) => (
                            <TableRow key={tag.id}>
                                <TableCell>
                                    {editState?.id === tag.id && editState.field === 'label' ? (
                                        <Input
                                            ref={editInputRef}
                                            value={editState.value}
                                            onChange={(e) => onEditChange(e.target.value)}
                                            onBlur={() => onCommitEdit(tag.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") onCommitEdit(tag.id)
                                                if (e.key === "Escape") onCancelEdit()
                                            }}
                                            className="h-7 max-w-xs"
                                        />
                                    ) : (
                                        <span
                                            className="cursor-pointer rounded px-1 hover:bg-muted"
                                            onClick={() => onStartEdit(tag, 'label')}
                                        >
                                            {tag.label}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {editState?.id === tag.id && editState.field === 'label_en' ? (
                                        <Input
                                            ref={editInputRef}
                                            value={editState.value}
                                            onChange={(e) => onEditChange(e.target.value)}
                                            onBlur={() => onCommitEdit(tag.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") onCommitEdit(tag.id)
                                                if (e.key === "Escape") onCancelEdit()
                                            }}
                                            className="h-7 max-w-xs"
                                        />
                                    ) : (
                                        <span
                                            className="cursor-pointer rounded px-1 hover:bg-muted text-muted-foreground"
                                            onClick={() => onStartEdit(tag, 'label_en')}
                                        >
                                            {tag.label_en ?? <span className="italic opacity-40">—</span>}
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
                                            {otherKinds.map((k) => (
                                                <DropdownMenuItem key={k.id} onClick={() => onMoveKind(tag, k.id as MenuTagKind)}>
                                                    {k.label}
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => onDelete(tag)}
                                            >
                                                {t("deleteAction")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* Add row */}
                        <TableRow className="last:[&>td]:rounded-bl-md last:[&>td]:rounded-br-md">
                            <TableCell>
                                <Input
                                    placeholder={t("addPlaceholder")}
                                    value={addState.label}
                                    onChange={(e) => onAddChange('label', e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") void onAdd(kind) }}
                                    disabled={isAdding}
                                    className="h-7 max-w-xs"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    placeholder={t("addPlaceholderEn")}
                                    value={addState.labelEn}
                                    onChange={(e) => onAddChange('labelEn', e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") void onAdd(kind) }}
                                    disabled={isAdding}
                                    className="h-7 max-w-xs"
                                />
                            </TableCell>
                            <TableCell />
                            <TableCell>
                                <Button
                                    onClick={() => void onAdd(kind)}
                                    disabled={isAdding || !addState.label.trim()}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>

                        {tags.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-10 text-center text-muted-foreground text-sm">
                                    {t("emptyState")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

export function MenuTagsTable({ data }: MenuTagsTableProps) {
    const router = useRouter()
    const t = useTranslations("settings.menuTags")
    const [editState, setEditState] = useState<EditState | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<MenuTagWithCount | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [dietaryAdd, setDietaryAdd] = useState<AddState>({ label: '', labelEn: '' })
    const [ingredientAdd, setIngredientAdd] = useState<AddState>({ label: '', labelEn: '' })
    const [seasonAdd, setSeasonAdd] = useState<AddState>({ label: '', labelEn: '' })
    const editInputRef = useRef<HTMLInputElement>(null)
    const [localData, setLocalData] = useState<MenuTagWithCount[]>(data)

    // Sync server data back in after router.refresh() completes
    useEffect(() => { setLocalData(data) }, [data])

    const dietaryTags = localData.filter((t) => t.kind === 'dietary')
    const ingredientTags = localData.filter((t) => t.kind === 'ingredient')
    const seasonTags = localData.filter((t) => t.kind === 'season')

    const startEdit = (tag: MenuTagWithCount, field: 'label' | 'label_en') => {
        setEditState({ id: tag.id, field, value: (field === 'label' ? tag.label : tag.label_en) ?? '' })
        setTimeout(() => editInputRef.current?.focus(), 0)
    }

    const commitEdit = async (tagId: string) => {
        if (!editState) return
        const { field, value } = editState
        setEditState(null)

        const original = localData.find((t) => t.id === tagId)
        if (!original) return

        if (field === 'label') {
            const trimmed = value.trim()
            if (!trimmed || trimmed === original.label) return
            setLocalData((prev) => prev.map((t) => t.id === tagId ? { ...t, label: trimmed } : t))
            const result = await updateMenuTag(tagId, { label: trimmed })
            if (result.error) {
                setLocalData(data)
                toast.error(result.error)
            } else {
                router.refresh()
                toast.success(t("updateSuccess"))
            }
        } else {
            const trimmed = value.trim() || null
            if (trimmed === (original.label_en ?? null)) return
            setLocalData((prev) => prev.map((t) => t.id === tagId ? { ...t, label_en: trimmed } : t))
            const result = await updateMenuTag(tagId, { labelEn: trimmed })
            if (result.error) {
                setLocalData(data)
                toast.error(result.error)
            } else {
                router.refresh()
                toast.success(t("updateSuccess"))
            }
        }
    }

    const handleMoveKind = async (tag: MenuTagWithCount, nextKind: MenuTagKind) => {
        setLocalData((prev) => prev.map((t) => t.id === tag.id ? { ...t, kind: nextKind } : t))
        const result = await updateMenuTag(tag.id, { kind: nextKind })
        if (result.error) {
            setLocalData(data)
            toast.error(result.error)
        } else {
            router.refresh()
            toast.success(t("updateSuccess"))
        }
    }

    const handleAdd = async (kind: MenuTagKind) => {
        const addState = kind === 'dietary' ? dietaryAdd : kind === 'season' ? seasonAdd : ingredientAdd
        const label = addState.label.trim()
        if (!label) return

        setIsAdding(true)
        try {
            const result = await createMenuTag(label, { labelEn: addState.labelEn.trim() || undefined, kind })
            if (result.error) throw new Error(result.error)
            if (result.data) {
                setLocalData((prev) => [...prev, { ...result.data!, menu_count: 0, menus: [] }])
            }
            if (kind === 'dietary') setDietaryAdd({ label: '', labelEn: '' })
            else if (kind === 'season') setSeasonAdd({ label: '', labelEn: '' })
            else setIngredientAdd({ label: '', labelEn: '' })
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
            const result = await deleteMenuTag(deleteTarget.id)
            if (result.error) throw new Error(result.error)
            setLocalData((prev) => prev.filter((t) => t.id !== deleteTarget.id))
            setDeleteTarget(null)
            router.refresh()
            toast.success(t("deleteSuccess"))
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : t("deleteFailed"))
        } finally {
            setIsDeleting(false)
        }
    }

    const commonGroupProps = {
        editState,
        editInputRef,
        onStartEdit: startEdit,
        onEditChange: (value: string) => setEditState((s) => s ? { ...s, value } : null),
        onCommitEdit: (tagId: string) => void commitEdit(tagId),
        onCancelEdit: () => setEditState(null),
        onDelete: setDeleteTarget,
        onMoveKind: (tag: MenuTagWithCount, nextKind: MenuTagKind) => void handleMoveKind(tag, nextKind),
        isAdding,
        t,
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-medium">{t("title")}</h2>
                <p className="text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <TagGroup
                kind="dietary"
                tags={dietaryTags}
                addState={dietaryAdd}
                onAddChange={(field, value) => setDietaryAdd((s) => ({ ...s, [field]: value }))}
                onAdd={handleAdd}
                {...commonGroupProps}
            />

            <TagGroup
                kind="ingredient"
                tags={ingredientTags}
                addState={ingredientAdd}
                onAddChange={(field, value) => setIngredientAdd((s) => ({ ...s, [field]: value }))}
                onAdd={handleAdd}
                {...commonGroupProps}
            />

            <TagGroup
                kind="season"
                tags={seasonTags}
                addState={seasonAdd}
                onAddChange={(field, value) => setSeasonAdd((s) => ({ ...s, [field]: value }))}
                onAdd={handleAdd}
                {...commonGroupProps}
            />

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
