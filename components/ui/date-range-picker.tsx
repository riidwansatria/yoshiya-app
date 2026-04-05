'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { ja, enUS, type Locale } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DateRangePickerProps {
    /** ISO start date (yyyy-MM-dd) */
    from: string;
    /** ISO end date (yyyy-MM-dd) */
    to: string;
    /** Emits when both endpoints have been picked */
    onChange: (from: string, to: string) => void;
    locale?: 'en' | 'ja';
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

const LOCALES: Record<'en' | 'ja', Locale> = { en: enUS, ja };

export function DateRangePicker({
    from,
    to,
    onChange,
    locale = 'en',
    placeholder,
    className,
    disabled,
}: DateRangePickerProps) {
    const [open, setOpen] = React.useState(false);
    const dateLocale = LOCALES[locale];
    const displayFormat = locale === 'ja' ? 'yyyy年M月d日' : 'PPP';

    const selectedRange: DateRange | undefined =
        from || to
            ? {
                  from: from ? parseISO(from) : undefined,
                  to: to ? parseISO(to) : undefined,
              }
            : undefined;

    const label = React.useMemo(() => {
        if (!from) return placeholder ?? '';
        const fromLabel = format(parseISO(from), displayFormat, { locale: dateLocale });
        if (!to || to === from) return fromLabel;
        const toLabel = format(parseISO(to), displayFormat, { locale: dateLocale });
        return `${fromLabel} — ${toLabel}`;
    }, [from, to, displayFormat, dateLocale, placeholder]);

    const handleSelect = (range: DateRange | undefined) => {
        if (!range?.from) return;
        const nextFrom = format(range.from, 'yyyy-MM-dd');
        const nextTo = range.to ? format(range.to, 'yyyy-MM-dd') : nextFrom;
        onChange(nextFrom, nextTo);
        // Close only once both ends have been chosen (range.to populated).
        if (range.to) setOpen(false);
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
                        !from && 'text-muted-foreground',
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="range"
                    captionLayout="dropdown"
                    selected={selectedRange}
                    onSelect={handleSelect}
                    locale={dateLocale}
                    numberOfMonths={2}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
