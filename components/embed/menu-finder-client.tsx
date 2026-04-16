'use client'

import * as React from 'react'

import { Circle, Minus, X } from 'lucide-react'
import type { Menu, MenuTag } from '@/lib/types/kitchen'
import { menuMatchesTagFilters, type MenuTagFilterSelection } from '@/lib/utils/menu-tags'
import { cn } from '@/lib/utils'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

// ─── Hardcoded categorization ─────────────────────────────────────────────────
// Tags whose labels match any of these (case-insensitive) go into the CATEGORY
// row. All other tags go into the INGREDIENTS grid.
// Replace with a `kind` DB column when that migration is added.
const DIETARY_LABELS = new Set([
    'halal', 'ハラール',
    'vegan', 'ヴィーガン', 'ビーガン',
    'vegetarian', 'ベジタリアン',
    'gluten free', 'gluten-free', 'gf', 'グルテンフリー', 'グルテン',
    'allergen free', 'allergen-free', 'agf', 'アレルゲンフリー', 'アレルギー',
    'kosher', 'コーシャ',
])

const PRICE_PRESETS: { label: string; value: number | null }[] = [
    { label: '〜¥3,300', value: 3300 },
    { label: '〜¥5,500', value: 5500 },
    { label: '〜¥8,800', value: 8800 },
    { label: '〜¥11,000', value: 11000 },
]

function isDietary(label: string) {
    return DIETARY_LABELS.has(label.toLowerCase().trim())
}

// ─── Component ────────────────────────────────────────────────────────────────
interface MenuFinderClientProps {
    menus: Menu[]
    allTags: MenuTag[]
}

type IngredientMode = 'exclude'

export function MenuFinderClient({ menus, allTags }: MenuFinderClientProps) {
    const [includedDietaryIds, setIncludedDietaryIds] = React.useState<Set<string>>(new Set())
    const [ingredientFilters, setIngredientFilters] = React.useState<Map<string, IngredientMode>>(new Map())
    const [maxPrice, setMaxPrice] = React.useState<number | null>(null)

    // Auto-height: notify parent iframe of content height changes
    React.useEffect(() => {
        const post = () =>
            window.parent.postMessage(
                { type: 'menu-finder-height', height: document.body.scrollHeight },
                '*',
            )
        post()
        const observer = new ResizeObserver(post)
        observer.observe(document.body)
        return () => observer.disconnect()
    }, [])

    const { dietaryTags, ingredientTags } = React.useMemo(() => {
        const usedIds = new Set(menus.flatMap(m => (m.tags ?? []).map(t => t.id)))
        const active = allTags.filter(t => usedIds.has(t.id))
        return {
            dietaryTags: active.filter(t => isDietary(t.label)),
            ingredientTags: active.filter(t => !isDietary(t.label)),
        }
    }, [menus, allTags])

    const filtered = React.useMemo(() => {
        const filters: MenuTagFilterSelection[] = [
            ...Array.from(includedDietaryIds).map(id => ({ tagId: id, mode: 'include' as const })),
            ...Array.from(ingredientFilters.entries()).map(([tagId, mode]) => ({ tagId, mode })),
        ]
        return menus.filter(menu => {
            if (maxPrice !== null && (menu.price ?? 0) > maxPrice) return false
            return menuMatchesTagFilters((menu.tags ?? []).map(t => t.id), filters)
        })
    }, [menus, includedDietaryIds, ingredientFilters, maxPrice])

    const toggleDietary = (id: string) =>
        setIncludedDietaryIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
        })

    const toggleExclude = (id: string) =>
        setIngredientFilters(prev => {
            const next = new Map(prev)
            if (next.has(id)) next.delete(id)
            else next.set(id, 'exclude')
            return next
        })

    const ingredientMode = (id: string): IngredientMode | 'neutral' =>
        ingredientFilters.get(id) ?? 'neutral'

    const hasActiveFilters =
        includedDietaryIds.size > 0 || ingredientFilters.size > 0 || maxPrice !== null

    return (
        <div className="space-y-4 select-none">

            {/* ── Filters ──────────────────────────────────────────────────── */}
            <div className="rounded-lg border border-border divide-y divide-border">

                {/* Category */}
                <div className="flex items-center gap-4 px-4 py-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20">
                        食の配慮
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {dietaryTags.map(tag => (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => toggleDietary(tag.id)}
                                className={cn(
                                    'px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer',
                                    includedDietaryIds.has(tag.id)
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'border-border text-foreground hover:bg-muted',
                                )}
                            >
                                {tag.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Price */}
                <div className="flex items-center gap-4 px-4 py-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20">
                        価格
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {PRICE_PRESETS.map(opt => (
                            <button
                                key={String(opt.value)}
                                type="button"
                                onClick={() => setMaxPrice(maxPrice === opt.value ? null : opt.value)}
                                className={cn(
                                    'px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer',
                                    maxPrice === opt.value
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'border-border text-foreground hover:bg-muted',
                                )}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ingredients */}
                {ingredientTags.length > 0 && (
                    <div className="px-4 py-3 space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            食材
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {ingredientTags.map(tag => {
                                const mode = ingredientMode(tag.id)
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleExclude(tag.id)}
                                        className={cn(
                                            'flex flex-col items-center gap-1 px-3 pt-2 pb-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer min-w-14',
                                            mode === 'exclude'
                                                ? 'border-red-200 bg-red-50 text-red-700'
                                                : 'border-border text-foreground hover:bg-muted',
                                        )}
                                    >
                                        <span>{tag.label}</span>
                                        {mode === 'exclude'
                                            ? <X className="size-3.5" />
                                            : <Minus className="size-3.5 opacity-30" />}
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <X className="size-3" /> 除く · クリックで切替
                        </p>
                    </div>
                )}

            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={() => {
                        setIncludedDietaryIds(new Set())
                        setIngredientFilters(new Map())
                        setMaxPrice(null)
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors cursor-pointer"
                >
                    フィルターをクリア
                </button>
            )}

            {/* ── Results table ────────────────────────────────────────────── */}
            <div className="rounded-lg border border-border overflow-hidden">
<Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-8 text-center" />
                            <TableHead>メニュー</TableHead>
                            <TableHead className="text-right">価格</TableHead>
                            {dietaryTags.map(tag => (
                                <TableHead key={tag.id} className="text-center">
                                    {tag.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map(menu => {
                            const menuTagIds = new Set((menu.tags ?? []).map(t => t.id))
                            return (
                                <TableRow key={menu.id}>
                                    <TableCell className="text-center" />
                                    <TableCell className="font-medium">{menu.name}</TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                        ¥{(menu.price ?? 0).toLocaleString()}
                                    </TableCell>
                                    {dietaryTags.map(tag => (
                                        <TableCell key={tag.id} className="text-center">
                                            {menuTagIds.has(tag.id) && (
                                                <Circle className="size-3.5 mx-auto text-emerald-600 fill-emerald-600" />
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )
                        })}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={3 + dietaryTags.length}
                                    className="text-center py-10 text-muted-foreground"
                                >
                                    条件に一致するメニューがありません。
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
