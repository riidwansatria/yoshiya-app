'use client';

import { useCallback, useMemo, useState } from 'react';
import { Eye, EyeOff, Filter, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { MenuTag } from '@/lib/queries/menu-tags';
import type { MenuTagFilterSelection } from '@/lib/utils/menu-tags';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';

interface MenuTagFilterProps {
    tags: MenuTag[];
    value: MenuTagFilterSelection[];
    onChange: (nextValue: MenuTagFilterSelection[]) => void;
}

export function MenuTagFilter({ tags, value, onChange }: MenuTagFilterProps) {
    const t = useTranslations('kitchen');
    const [inputValue, setInputValue] = useState('');
    const [open, setOpen] = useState(false);

    const selectedIds = useMemo(() => new Set(value.map((filter) => filter.tagId)), [value]);
    const availableTags = useMemo(
        () => tags.filter((tag) => !selectedIds.has(tag.id)),
        [selectedIds, tags]
    );
    const selectedTags = useMemo(() => value.map((filter) => ({
        ...filter,
        tag: tags.find((tag) => tag.id === filter.tagId) ?? null,
    })).filter((filter): filter is MenuTagFilterSelection & { tag: MenuTag } => filter.tag !== null), [tags, value]);

    const addFilter = useCallback((tagId: string) => {
        onChange([...value, { tagId, mode: 'include' }]);
        setInputValue('');
    }, [onChange, value]);

    const toggleMode = useCallback((tagId: string) => {
        onChange(value.map((filter) => (
            filter.tagId === tagId
                ? { ...filter, mode: filter.mode === 'include' ? 'exclude' : 'include' }
                : filter
        )));
    }, [onChange, value]);

    const removeFilter = useCallback((tagId: string) => {
        onChange(value.filter((filter) => filter.tagId !== tagId));
    }, [onChange, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="h-9 shrink-0 gap-2"
                >
                    <Filter className="h-4 w-4" />
                    <span>{t('menus.filters.button')}</span>
                    {value.length > 0 ? (
                        <Badge variant="secondary" className="ml-1 min-w-5 px-1.5">
                            {value.length}
                        </Badge>
                    ) : null}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] p-3">
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">{t('menus.filters.title')}</div>
                        {selectedTags.length > 0 ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
                                {t('menus.filters.clearAll')}
                            </Button>
                        ) : null}
                    </div>

                    <Combobox
                        items={availableTags}
                        value={null as MenuTag | null}
                        onValueChange={(tag) => {
                            const nextTag = tag as MenuTag | null;
                            if (nextTag) {
                                addFilter(nextTag.id);
                            }
                        }}
                        itemToStringLabel={(tag: MenuTag) => tag.label}
                        autoHighlight
                    >
                        <ComboboxInput
                            value={inputValue}
                            placeholder={t('menus.filters.tagsPlaceholder')}
                            onInput={(event) => setInputValue((event.target as HTMLInputElement).value)}
                        />
                        <ComboboxContent>
                            <ComboboxEmpty>{t('menus.filters.tagsEmpty')}</ComboboxEmpty>
                            <ComboboxList>
                                {(tag) => (
                                    <ComboboxItem key={tag.id} value={tag}>
                                        <span className="truncate">{tag.label}</span>
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>

                    {selectedTags.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {selectedTags.map(({ mode, tag }) => (
                                <Badge
                                    key={tag.id}
                                    variant="outline"
                                    className={
                                        mode === 'exclude'
                                            ? 'gap-1 border-red-200 bg-red-50 pr-1 pl-2 text-red-700'
                                            : 'gap-1 border-emerald-200 bg-emerald-50 pr-1 pl-2 text-emerald-700'
                                    }
                                >
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-left"
                                        onClick={() => toggleMode(tag.id)}
                                        aria-label={t('menus.filters.toggleMode', {
                                            name: tag.label,
                                            mode: mode === 'include'
                                                ? t('menus.filters.excludeMode')
                                                : t('menus.filters.includeMode'),
                                        })}
                                    >
                                        {mode === 'include' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                        <span>{tag.label}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-background/80"
                                        onClick={() => removeFilter(tag.id)}
                                        aria-label={t('menus.filters.removeTag', { name: tag.label })}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                            {t('menus.filters.emptyState')}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
