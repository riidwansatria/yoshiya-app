'use client';

import { type KeyboardEvent, useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { ComponentOption } from '@/lib/queries/components';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';
import { AddComponentDialogInline } from './add-component-dialog-inline';

interface ComponentComboboxProps {
    value: string;
    onValueChange: (value: string) => void;
    components: ComponentOption[];
    restaurantId: string;
    usedIds?: Set<string>;
    onNewComponent?: (component: ComponentOption) => void;
}

export function ComponentCombobox({
    value,
    onValueChange,
    components,
    restaurantId,
    usedIds = new Set(),
    onNewComponent,
}: ComponentComboboxProps) {
    const t = useTranslations('kitchen');
    const [showCreate, setShowCreate] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [pendingName, setPendingName] = useState('');

    const selected = components.find((component) => component.id === value) ?? null;

    const hasMatches = inputValue.trim() === '' ||
        components.some((component) =>
            component.name.toLowerCase().includes(inputValue.trim().toLowerCase())
        );

    const openCreate = useCallback((name: string) => {
        setPendingName(name);
        setShowCreate(true);
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !hasMatches && inputValue.trim()) {
            e.preventDefault();
            e.stopPropagation();
            openCreate(inputValue.trim());
        }
    }, [hasMatches, inputValue, openCreate]);

    return (
        <>
            <Combobox
                value={selected}
                onValueChange={(item) => {
                    if (item) onValueChange(item.id);
                }}
                items={components}
                itemToStringLabel={(item) => item.name}
                autoHighlight
            >
                <ComboboxInput
                    placeholder={t('componentCombobox.searchPlaceholder')}
                    showClear={!!value}
                    onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
                    onKeyDown={handleKeyDown}
                />
                <ComboboxContent>
                    <ComboboxEmpty>{t('componentCombobox.empty')}</ComboboxEmpty>
                    <ComboboxList>
                        {(component) => {
                            const isUsed = usedIds.has(component.id) && component.id !== value;
                            return (
                                <ComboboxItem
                                    key={component.id}
                                    value={component}
                                    className={cn(isUsed && 'opacity-40')}
                                >
                                    <span className="truncate">{component.name}</span>
                                    {isUsed ? (
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {t('common.used')}
                                        </span>
                                    ) : null}
                                </ComboboxItem>
                            );
                        }}
                    </ComboboxList>
                    <div className="sticky bottom-0 border-t bg-popover p-1">
                        <button
                            type="button"
                            className={cn(
                                'text-primary flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent',
                                !hasMatches && inputValue.trim() && 'bg-accent font-medium ring-1 ring-primary/30'
                            )}
                            onClick={() => openCreate(inputValue.trim())}
                        >
                            <Plus className="h-4 w-4" />
                            {!hasMatches && inputValue.trim()
                                ? t('componentCombobox.createNamed', { name: inputValue.trim() })
                                : t('componentCombobox.createNew')}
                        </button>
                    </div>
                </ComboboxContent>
            </Combobox>

            <AddComponentDialogInline
                open={showCreate}
                onOpenChange={setShowCreate}
                restaurantId={restaurantId}
                initialName={pendingName}
                onSuccess={(newComponent) => {
                    const option = { id: newComponent.id, name: newComponent.name };
                    onNewComponent?.(option);
                    onValueChange(option.id);
                }}
            />
        </>
    );
}
