'use client';

import { type KeyboardEvent, useCallback, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { createMenuTag } from '@/lib/actions/menu-tags';
import type { MenuTag } from '@/lib/queries/menu-tags';
import { cn } from '@/lib/utils';
import { normalizeMenuTagLookupLabel } from '@/lib/utils/menu-tags';

import { Badge } from '@/components/ui/badge';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';

interface MenuTagSelectorProps {
    restaurantId: string;
    tags: MenuTag[];
    selectedTagIds: string[];
    onChange: (nextTagIds: string[]) => void;
    onNewTag: (tag: MenuTag) => void;
}

export function MenuTagSelector({
    restaurantId,
    tags,
    selectedTagIds,
    onChange,
    onNewTag,
}: MenuTagSelectorProps) {
    const t = useTranslations('kitchen');
    const [inputValue, setInputValue] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const selectedTags = useMemo(
        () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
        [selectedTagIds, tags]
    );
    const availableTags = useMemo(
        () => tags.filter((tag) => !selectedTagIds.includes(tag.id)),
        [selectedTagIds, tags]
    );

    const trimmedInput = inputValue.trim();
    const normalizedInput = normalizeMenuTagLookupLabel(trimmedInput);
    const hasMatches = trimmedInput === '' ||
        availableTags.some((tag) =>
            tag.label.toLowerCase().includes(trimmedInput.toLowerCase())
        );
    const matchingSelectedTag = selectedTags.find(
        (tag) => normalizeMenuTagLookupLabel(tag.label) === normalizedInput
    );
    const canCreate = trimmedInput !== '' && !tags.some(
        (tag) => normalizeMenuTagLookupLabel(tag.label) === normalizedInput
    );

    const addTag = useCallback((tagId: string) => {
        if (selectedTagIds.includes(tagId)) {
            return;
        }

        onChange([...selectedTagIds, tagId]);
        setInputValue('');
    }, [onChange, selectedTagIds]);

    const removeTag = useCallback((tagId: string) => {
        onChange(selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId));
    }, [onChange, selectedTagIds]);

    const handleCreate = useCallback(async () => {
        if (!trimmedInput) {
            toast.error(t('menus.tags.validation.required'));
            return;
        }

        if (matchingSelectedTag) {
            toast.error(t('menus.tags.validation.alreadySelected'));
            return;
        }

        setIsCreating(true);

        try {
            const result = await createMenuTag({
                restaurant_id: restaurantId,
                label: trimmedInput,
            });

            if (result.error || !result.data) {
                throw new Error(result.error || t('menus.tags.createFailed'));
            }

            onNewTag(result.data);
            addTag(result.data.id);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : t('menus.tags.createFailed'));
        } finally {
            setIsCreating(false);
        }
    }, [addTag, matchingSelectedTag, onNewTag, restaurantId, t, trimmedInput]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && canCreate) {
            event.preventDefault();
            event.stopPropagation();
            void handleCreate();
        }
    }, [canCreate, handleCreate]);

    return (
        <div className="space-y-3">
            <Combobox
                items={availableTags}
                value={null as MenuTag | null}
                onValueChange={(tag) => {
                    const nextTag = tag as MenuTag | null;
                    if (nextTag) {
                        addTag(nextTag.id);
                    }
                }}
                itemToStringLabel={(tag: MenuTag) => tag.label}
                autoHighlight
            >
                <ComboboxInput
                    value={inputValue}
                    placeholder={t('menus.tags.placeholder')}
                    onInput={(event) => setInputValue((event.target as HTMLInputElement).value)}
                    onKeyDown={handleKeyDown}
                    disabled={isCreating}
                />
                <ComboboxContent>
                    <ComboboxEmpty>{t('menus.tags.empty')}</ComboboxEmpty>
                    <ComboboxList>
                        {(tag) => (
                            <ComboboxItem key={tag.id} value={tag}>
                                <span className="truncate">{tag.label}</span>
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                    {trimmedInput ? (
                        <div className="sticky bottom-0 border-t bg-popover p-1">
                            <button
                                type="button"
                                className={cn(
                                    'text-primary flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
                                    canCreate && 'bg-accent font-medium ring-1 ring-primary/30'
                                )}
                                onClick={() => void handleCreate()}
                                disabled={isCreating || !canCreate}
                            >
                                <Plus className="h-4 w-4" />
                                {canCreate
                                    ? t('menus.tags.createNamed', { name: trimmedInput })
                                    : matchingSelectedTag
                                        ? t('menus.tags.alreadySelected')
                                        : hasMatches
                                            ? t('menus.tags.createNew')
                                            : t('menus.tags.createNew')}
                            </button>
                        </div>
                    ) : null}
                </ComboboxContent>
            </Combobox>

            {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                        <Badge key={tag.id} variant="secondary" className="gap-1 pl-2 pr-1">
                            <span>{tag.label}</span>
                            <button
                                type="button"
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground"
                                onClick={() => removeTag(tag.id)}
                                aria-label={t('menus.tags.remove', { name: tag.label })}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
