'use client'

import * as React from 'react'

import { Circle, Minus, X } from 'lucide-react'
import type { Menu, MenuTag } from '@/lib/types/kitchen'
import { menuMatchesTagFilters, type MenuTagFilterSelection } from '@/lib/utils/menu-tags'
import { cn } from '@/lib/utils'
import { MenuListImage } from '@/components/embed/menu-list-image'
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

const PRICE_PRESETS = [3300, 5500, 8800, 11000] as const

function isDietary(label: string) {
    return DIETARY_LABELS.has(label.toLowerCase().trim())
}

// ─── Component ────────────────────────────────────────────────────────────────
interface MenuFinderClientProps {
    menus: Menu[]
    allTags: MenuTag[]
    locale: EmbedMenuFinderLocale
    labels: MenuFinderClientLabels
}

type IngredientMode = 'exclude'

export type EmbedMenuFinderLocale = 'ja' | 'en'

export interface MenuFinderClientLabels {
    dietary: string
    dietaryHint: string
    price: string
    priceAll: string
    pricePresetTemplate: string
    ingredients: string
    excludeHint: string
    clearFilters: string
    menu: string
    priceColumn: string
    noResults: string
}

export function MenuFinderClient({ menus, allTags, locale, labels }: MenuFinderClientProps) {
    const [includedDietaryIds, setIncludedDietaryIds] = React.useState<Set<string>>(new Set())
    const [ingredientFilters, setIngredientFilters] = React.useState<Map<string, IngredientMode>>(new Map())
    const [minPrice, setMinPrice] = React.useState<number | null>(null)
    const numberLocale = locale === 'ja' ? 'ja-JP' : 'en-US'

    const formatYen = React.useCallback(
        (value: number) => `¥${value.toLocaleString(numberLocale)}`,
        [numberLocale],
    )

    const formatPricePresetLabel = React.useCallback(
        (value: number) => labels.pricePresetTemplate.replace('{price}', formatYen(value)),
        [formatYen, labels.pricePresetTemplate],
    )

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
            if (minPrice !== null && (menu.price ?? 0) < minPrice) return false
            return menuMatchesTagFilters((menu.tags ?? []).map(t => t.id), filters)
        })
    }, [menus, includedDietaryIds, ingredientFilters, minPrice])

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
        includedDietaryIds.size > 0 || ingredientFilters.size > 0 || minPrice !== null

    return (
        <div className="space-y-4">

            {/* ── Filters ──────────────────────────────────────────────────── */}
            <div className="rounded-lg border border-border divide-y divide-border select-none">

                {/* Category */}
                <div className="flex items-center gap-4 px-4 py-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20">
                        {labels.dietary}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
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
                        <p className="text-xs text-muted-foreground">← {labels.dietaryHint}</p>
                    </div>
                </div>

                {/* Price */}
                <div className="flex items-center gap-4 px-4 py-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 w-20">
                        {labels.price}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            type="button"
                            onClick={() => setMinPrice(null)}
                            className={cn(
                                'px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer',
                                minPrice === null
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-border text-foreground hover:bg-muted',
                            )}
                        >
                            {labels.priceAll}
                        </button>
                        {PRICE_PRESETS.map(value => (
                            <button
                                key={String(value)}
                                type="button"
                                onClick={() => setMinPrice(minPrice === value ? null : value)}
                                className={cn(
                                    'px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer',
                                    minPrice === value
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'border-border text-foreground hover:bg-muted',
                                )}
                            >
                                {formatPricePresetLabel(value)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ingredients */}
                {ingredientTags.length > 0 && (
                    <div className="px-4 py-3 space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {labels.ingredients}
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
                            <X className="size-3" /> {labels.excludeHint}
                        </p>
                    </div>
                )}

            </div>

            {/* Clear filters */}
            <div className="min-h-5">
                <button
                    type="button"
                    onClick={() => {
                        setIncludedDietaryIds(new Set())
                        setIngredientFilters(new Map())
                        setMinPrice(null)
                    }}
                    disabled={!hasActiveFilters}
                    aria-hidden={!hasActiveFilters}
                    className={cn(
                        'text-xs underline underline-offset-2 transition-colors',
                        hasActiveFilters
                            ? 'cursor-pointer text-muted-foreground hover:text-foreground'
                            : 'pointer-events-none invisible'
                    )}
                >
                    {labels.clearFilters}
                </button>
            </div>

            {/* ── Results table ────────────────────────────────────────────── */}
            <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[8.5rem]">{labels.menu}</TableHead>
                            <TableHead />
                            <TableHead className="text-right">{labels.priceColumn}</TableHead>
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
                                <TableRow key={menu.id} className="align-middle">
                                    <TableCell className="py-3 pr-0">
                                        {menu.image_url ? (
                                            <a
                                                href={menu.image_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block cursor-zoom-in"
                                            >
                                                <MenuListImage menu={menu} />
                                            </a>
                                        ) : (
                                            <MenuListImage menu={menu} />
                                        )}
                                    </TableCell>
                                    <TableCell className="min-w-[16rem] py-3">
                                        <div className="space-y-1">
                                            <div className="font-medium text-base text-foreground">
                                                {menu.name}
                                            </div>
                                            {(() => {
                                                const tags = (menu.tags ?? []).filter(t => !isDietary(t.label))
                                                return tags.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {tags.map(t => (
                                                            <span key={t.id} className="px-2 py-0.5 rounded-full text-xs border border-border text-muted-foreground">
                                                                {t.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : null
                                            })()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 text-right text-base tabular-nums text-foreground">
                                        {formatYen(menu.price ?? 0)}
                                    </TableCell>
                                    {dietaryTags.map(tag => (
                                        <TableCell key={tag.id} className="py-3 text-center">
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
                                    {labels.noResults}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

        </div>
    )
}
