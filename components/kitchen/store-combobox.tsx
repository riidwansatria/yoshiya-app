'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import {
    Combobox,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';

interface StoreComboboxProps {
    value: string;
    onValueChange: (value: string) => void;
    stores: string[];
}

function StoreComboboxContent({
    children,
    container,
}: {
    children: React.ReactNode;
    container: HTMLElement | null;
}) {
    return (
        <ComboboxPrimitive.Portal container={container ?? undefined}>
            <ComboboxPrimitive.Positioner
                side="bottom"
                sideOffset={6}
                align="start"
                alignOffset={0}
                className="isolate z-50"
            >
                <ComboboxPrimitive.Popup
                    data-slot="combobox-content"
                    className={cn(
                        'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:border-input/30 group/combobox-content relative max-h-[min(14rem,var(--available-height))] w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md shadow-md ring-1 duration-100 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:shadow-none'
                    )}
                >
                    {children}
                </ComboboxPrimitive.Popup>
            </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
    );
}

export function StoreCombobox({
    value,
    onValueChange,
    stores,
}: StoreComboboxProps) {
    const t = useTranslations('kitchen');
    const [inputValue, setInputValue] = useState(value);
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        setPortalContainer(rootRef.current?.closest('[data-slot="dialog-content"]') as HTMLElement | null);
    }, []);

    // Build options from distinct store names
    const options = Array.from(new Set(stores));

    // If the current value exists but isn't in the list, prepend it
    // (e.g. just created via "create" button)
    const allOptions =
        value && !options.includes(value)
            ? [value, ...options]
            : options;

    const selected = value || null;

    const hasMatches =
        inputValue.trim() === '' ||
        allOptions.some((option) =>
            option.toLowerCase().includes(inputValue.trim().toLowerCase())
        );

    // Check if the typed value already exists exactly (case-insensitive)
    const exactMatch = allOptions.some(
        (option) => option.toLowerCase() === inputValue.trim().toLowerCase()
    );

    const handleCreate = useCallback(
        (name: string) => {
            if (name) {
                onValueChange(name);
            }
        },
        [onValueChange]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !hasMatches && inputValue.trim()) {
                e.preventDefault();
                e.stopPropagation();
                handleCreate(inputValue.trim());
            }
        },
        [hasMatches, inputValue, handleCreate]
    );

    return (
        <div ref={rootRef}>
            <Combobox
                value={selected}
                onValueChange={(item) => onValueChange(item ?? '')}
                inputValue={inputValue}
                onInputValueChange={setInputValue}
                items={allOptions}
                itemToStringLabel={(item) => item}
                autoHighlight
            >
                <ComboboxInput
                    placeholder={t('storeCombobox.searchPlaceholder')}
                    showClear={!!value}
                    onKeyDown={handleKeyDown}
                />
                <StoreComboboxContent container={portalContainer}>
                    <ComboboxEmpty>{t('storeCombobox.empty')}</ComboboxEmpty>
                    <ComboboxList>
                        {(option) => (
                            <ComboboxItem key={option} value={option}>
                                <span className="truncate">{option}</span>
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                    {/* Show create button when input doesn't exactly match an existing option */}
                    {inputValue.trim() && !exactMatch ? (
                        <div className="sticky bottom-0 bg-popover border-t p-1">
                            <button
                                type="button"
                                className={cn(
                                    'text-primary flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent',
                                    !hasMatches &&
                                        'bg-accent font-medium ring-1 ring-primary/30'
                                )}
                                onClick={() => handleCreate(inputValue.trim())}
                            >
                                <Plus className="h-4 w-4" />
                                {t('storeCombobox.createNamed', {
                                    name: inputValue.trim(),
                                })}
                            </button>
                        </div>
                    ) : null}
                </StoreComboboxContent>
            </Combobox>
        </div>
    );
}
