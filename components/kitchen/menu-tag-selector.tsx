'use client';

import { useMemo } from 'react';
import type { MenuTag } from '@/lib/queries/menu-tags';
import type { MenuTagKind } from '@/lib/types/kitchen';
import { cn } from '@/lib/utils';

interface MenuTagSelectorProps {
    tags: MenuTag[];
    kind: MenuTagKind;
    selectedTagIds: string[];
    onChange: (nextTagIds: string[]) => void;
}

export function MenuTagSelector({ tags, kind, selectedTagIds, onChange }: MenuTagSelectorProps) {
    const kindTags = useMemo(() => tags.filter((tag) => tag.kind === kind), [tags, kind]);

    if (kindTags.length === 0) {
        return <p className="text-sm text-muted-foreground/50">—</p>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {kindTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                    <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                            onChange(
                                isSelected
                                    ? selectedTagIds.filter((id) => id !== tag.id)
                                    : [...selectedTagIds, tag.id]
                            )
                        }
                        className={cn(
                            'rounded-full border px-3 py-1 text-sm transition-colors',
                            isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border bg-background text-foreground hover:bg-muted'
                        )}
                    >
                        {tag.label}
                    </button>
                );
            })}
        </div>
    );
}
