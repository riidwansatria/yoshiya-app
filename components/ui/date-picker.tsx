'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { ja, enUS, type Locale } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DatePickerProps {
    /** ISO date string (yyyy-MM-dd) */
    value: string;
    /** Emits new ISO date string (yyyy-MM-dd). May be a no-op if user cancels via confirm prompt. */
    onChange: (value: string) => void;
    locale?: 'en' | 'ja';
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const LOCALES: Record<'en' | 'ja', Locale> = { en: enUS, ja };

export function DatePicker({
    value,
    onChange,
    locale = 'en',
    placeholder,
    className,
    disabled,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);
    const dateLocale = LOCALES[locale];
    const displayFormat = locale === 'ja' ? 'yyyy年M月d日 (EEE)' : 'PPP';

    const selected = value ? parseISO(value) : undefined;
    const label = selected ? format(selected, displayFormat, { locale: dateLocale }) : placeholder ?? '';

    const handleSelect = (date: Date | undefined) => {
        if (!date) return;
        onChange(format(date, 'yyyy-MM-dd'));
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        'justify-start text-left font-normal tabular-nums',
                        !selected && 'text-muted-foreground',
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    selected={selected}
                    onSelect={handleSelect}
                    locale={dateLocale}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
