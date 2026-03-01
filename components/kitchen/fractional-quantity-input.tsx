'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
    formatQuantityPreview,
    parseFractionalQuantity,
} from '@/lib/utils/fraction-quantity';

export function FractionalQuantityInput({
    value,
    onValueChange,
    onCommit,
    label = 'Quantity',
}: {
    value: string;
    onValueChange: (raw: string) => void;
    onCommit: (parsed: number | null, error: string | null) => void;
    label?: string;
}) {
    const parsed = useMemo(() => parseFractionalQuantity(value), [value]);
    const showPreview = parsed.ok && value.trim() !== '' && value.trim() !== parsed.normalized;

    const commitValue = (nextValue: string) => {
        const result = parseFractionalQuantity(nextValue);
        onCommit(result.ok ? result.value : null, result.ok ? null : result.error);
    };

    return (
        <div className="relative">
            <input
                type="text"
                inputMode="decimal"
                aria-label={label}
                placeholder="e.g. 1/6"
                value={value}
                onChange={(e) => {
                    const next = e.target.value;
                    onValueChange(next);
                    const result = parseFractionalQuantity(next);
                    if (result.ok) onCommit(result.value, null);
                }}
                onBlur={() => commitValue(value)}
                className={cn(
                    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
                    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
                    'placeholder:text-muted-foreground',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    !parsed.ok && value.trim() !== '' && 'border-destructive focus-visible:ring-destructive',
                    showPreview ? 'pr-16' : ''
                )}
            />
            {showPreview && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums pointer-events-none">
                    {formatQuantityPreview(parsed.value)}
                </span>
            )}
        </div>
    );
}
