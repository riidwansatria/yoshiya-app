'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Menu } from '@/lib/queries/menus';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';

interface MenuComboboxProps {
    value: string;
    onValueChange: (value: string) => void;
    menus: Menu[];
    /** IDs of menus already used in other rows — these are dimmed */
    usedIds?: Set<string>;
    placeholder?: string;
    invalid?: boolean;
}

export function MenuCombobox({
    value,
    onValueChange,
    menus,
    usedIds = new Set(),
    placeholder,
    invalid = false,
}: MenuComboboxProps) {
    const t = useTranslations('kitchen');
    const selected = menus.find((m) => m.id === value) ?? null;

    return (
        <Combobox
            value={selected}
            onValueChange={(item) => {
                if (item) onValueChange(item.id);
            }}
            items={menus}
            itemToStringLabel={(item) => item.name}
            autoHighlight
        >
            <ComboboxInput
                placeholder={placeholder ?? t('orders.menuPlaceholder')}
                showClear={!!value}
                className={cn(invalid && 'border-red-500 bg-red-50')}
            />
            <ComboboxContent>
                <ComboboxEmpty>{t('orders.menuEmpty')}</ComboboxEmpty>
                <ComboboxList>
                    {(menu) => {
                        const isUsed = usedIds.has(menu.id) && menu.id !== value;
                        return (
                            <ComboboxItem
                                key={menu.id}
                                value={menu}
                                className={cn(isUsed && 'opacity-40')}
                            >
                                <span className="truncate">{menu.name}</span>
                                {isUsed && (
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {t('common.used')}
                                    </span>
                                )}
                            </ComboboxItem>
                        );
                    }}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
