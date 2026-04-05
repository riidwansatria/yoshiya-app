'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash, Plus, CopyPlus, Save, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';

import { Menu } from '@/lib/queries/menus';
import { DailyOrder } from '@/lib/queries/daily-orders';
import { saveDailyOrders } from '@/lib/actions/daily-orders';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { MenuCombobox } from './menu-combobox';

interface OrderLine {
    id: string;
    menu_id: string;
    quantity: number;
    notes: string;
}

function toOrderLines(orders: DailyOrder[]): OrderLine[] {
    return orders.map((o) => ({
        id: crypto.randomUUID(),
        menu_id: o.menu_id,
        quantity: o.quantity,
        notes: o.notes || '',
    }));
}

/** Produces a canonical string of lines to compare dirty state (id-independent). */
function canonicalize(lines: { menu_id: string; quantity: number; notes: string | null }[]): string {
    return JSON.stringify(
        lines
            .map((l) => ({ menu_id: l.menu_id, quantity: l.quantity, notes: (l.notes || '').trim() }))
            .sort((a, b) => {
                if (a.menu_id !== b.menu_id) return a.menu_id.localeCompare(b.menu_id);
                if (a.quantity !== b.quantity) return a.quantity - b.quantity;
                return a.notes.localeCompare(b.notes);
            })
    );
}

// Case-insensitive substring match
function fuzzyMatchMenu(query: string, menus: Menu[]): Menu | null {
    const normalizedQuery = query.trim().toLowerCase();
    const exact = menus.find((m) => m.name.toLowerCase() === normalizedQuery);
    if (exact) return exact;
    const substring = menus.find((m) => m.name.toLowerCase().includes(normalizedQuery));
    if (substring) return substring;
    return null;
}

export function DailyOrdersForm({
    restaurantId,
    targetDate,
    availableMenus,
    initialOrders,
}: {
    restaurantId: string;
    targetDate: string;
    availableMenus: Menu[];
    initialOrders: DailyOrder[];
}) {
    const router = useRouter();
    const t = useTranslations('kitchen.orders');
    const locale = useLocale();

    const [isSaving, setIsSaving] = useState(false);
    const [dateStr, setDateStr] = useState(targetDate);
    const [pasteData, setPasteData] = useState('');
    const [orderLines, setOrderLines] = useState<OrderLine[]>(() => toOrderLines(initialOrders));
    const [savedAt, setSavedAt] = useState<Date | null>(null);

    // Baseline snapshot for dirty comparison. Updated on load and after successful save.
    const baselineRef = useRef<string>(canonicalize(initialOrders));

    // Reset local state when navigating to a different target date.
    useEffect(() => {
        setDateStr(targetDate);
        setOrderLines(toOrderLines(initialOrders));
        baselineRef.current = canonicalize(initialOrders);
        setSavedAt(null);
    }, [targetDate, initialOrders]);

    const currentCanonical = useMemo(() => canonicalize(orderLines), [orderLines]);
    const isDirty = currentCanonical !== baselineRef.current;

    // Warn on tab close / navigation when there are unsaved changes.
    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);

    const usedMenuIds = useMemo(
        () => new Set(orderLines.filter((l) => l.menu_id).map((l) => l.menu_id)),
        [orderLines]
    );

    const summary = useMemo(() => {
        const validLines = orderLines.filter((l) => l.menu_id && l.quantity > 0);
        const totalOrders = validLines.reduce((sum, l) => sum + l.quantity, 0);
        const uniqueMenus = new Set(validLines.map((l) => l.menu_id)).size;
        return { totalOrders, uniqueMenus };
    }, [orderLines]);

    const handleDateChange = (newDate: string) => {
        if (newDate === dateStr) return;
        if (isDirty && !window.confirm(t('unsavedWarning'))) {
            return;
        }
        setDateStr(newDate);
        router.push(`/dashboard/${restaurantId}/kitchen/orders?date=${newDate}`);
    };

    const handleLineChange = (id: string, field: 'menu_id' | 'quantity' | 'notes', value: string | number) => {
        setOrderLines((prev) => prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
    };

    const addLine = () => {
        setOrderLines((prev) => [...prev, { id: crypto.randomUUID(), menu_id: '', quantity: 1, notes: '' }]);
    };

    const removeLine = (id: string) => {
        setOrderLines((prev) => prev.filter((line) => line.id !== id));
    };

    const handlePasteProcess = () => {
        if (!pasteData.trim()) return;

        const lines = pasteData.split('\n');
        const newLines: OrderLine[] = [];
        let unmappedCount = 0;

        lines.forEach((lineText) => {
            const parts = lineText.split('\t');
            if (parts.length >= 2) {
                const menuNameRaw = parts[0];
                const qtyRaw = parseInt(parts[1], 10);
                const notesRaw = parts[2] || '';

                if (!isNaN(qtyRaw)) {
                    const matchedMenu = fuzzyMatchMenu(menuNameRaw, availableMenus);

                    if (matchedMenu) {
                        newLines.push({
                            id: crypto.randomUUID(),
                            menu_id: matchedMenu.id,
                            quantity: qtyRaw,
                            notes: notesRaw.trim(),
                        });
                    } else {
                        unmappedCount++;
                        newLines.push({
                            id: crypto.randomUUID(),
                            menu_id: '',
                            quantity: qtyRaw,
                            notes: `Pasted as: ${menuNameRaw} - ${notesRaw}`.trim(),
                        });
                    }
                }
            }
        });

        if (newLines.length > 0) {
            setOrderLines((prev) => [...prev, ...newLines]);
            setPasteData('');
            if (unmappedCount > 0) {
                toast.warning(t('parsedWithWarnings', { count: unmappedCount }));
            } else {
                toast.success(t('parsedSuccess', { count: newLines.length }));
            }
        } else {
            toast.error(t('parseError'));
        }
    };

    const handleSave = useCallback(async () => {
        const invalidLines = orderLines.filter((line) => !line.menu_id || line.quantity <= 0);
        if (invalidLines.length > 0) {
            toast.error(t('saveValidation'));
            return;
        }

        setIsSaving(true);
        try {
            const payload = orderLines.map((line) => ({
                menu_id: line.menu_id,
                quantity: line.quantity,
                notes: line.notes,
            }));
            const result = await saveDailyOrders(restaurantId, dateStr, payload);
            if (result.error) throw new Error(result.error);

            baselineRef.current = canonicalize(orderLines);
            setSavedAt(new Date());
            toast.success(t('saveSuccess'));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    }, [orderLines, restaurantId, dateStr, t]);

    // Cmd/Ctrl + S to save.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (!isSaving && isDirty) {
                    void handleSave();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSave, isDirty, isSaving]);

    const formattedSavedAt = savedAt ? format(savedAt, 'HH:mm') : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                    <label className="font-semibold whitespace-nowrap">{t('targetDate')}:</label>
                    <DatePicker
                        value={dateStr}
                        onChange={handleDateChange}
                        locale={locale === 'ja' ? 'ja' : 'en'}
                    />
                </div>
                <div className="sm:ml-auto flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground tabular-nums">
                        {t('summaryLabel', { orders: summary.totalOrders, menus: summary.uniqueMenus })}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
                {/* Editor Area */}
                <div className="space-y-4 border rounded-md p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">{t('orderLinesTitle')}</h3>
                        <Button variant="outline" size="sm" onClick={addLine}>
                            <Plus className="h-4 w-4 mr-2" /> {t('addLine')}
                        </Button>
                    </div>

                    {orderLines.length === 0 ? (
                        <div className="text-center p-8 border border-dashed rounded-md bg-muted/50">
                            <p className="text-muted-foreground text-sm">{t('noOrders')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="gap-4 text-sm font-medium text-muted-foreground px-1 hidden md:flex">
                                <div className="w-8">#</div>
                                <div className="flex-[2]">{t('menuColumn')}</div>
                                <div className="w-[100px]">{t('qtyColumn')}</div>
                                <div className="flex-[2]">{t('notesColumn')}</div>
                                <div className="w-10"></div>
                            </div>

                            {orderLines.map((line, index) => {
                                return (
                                    <div
                                        key={line.id}
                                        className="flex flex-col md:flex-row gap-4 items-start bg-background p-2 md:p-1 border md:border-transparent rounded-md"
                                    >
                                        <div className="w-full md:w-8 text-sm text-muted-foreground tabular-nums md:pt-2">
                                            {index + 1}
                                        </div>
                                        <div className="flex-[2] w-full">
                                            <MenuCombobox
                                                value={line.menu_id}
                                                onValueChange={(val) => handleLineChange(line.id, 'menu_id', val)}
                                                menus={availableMenus}
                                                usedIds={usedMenuIds}
                                                invalid={!line.menu_id}
                                            />
                                        </div>
                                        <div className="w-full md:w-[100px]">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={line.quantity}
                                                onChange={(e) =>
                                                    handleLineChange(line.id, 'quantity', parseInt(e.target.value) || 0)
                                                }
                                            />
                                        </div>
                                        <div className="flex-[2] w-full">
                                            <Input
                                                placeholder={t('notesPlaceholder')}
                                                value={line.notes}
                                                onChange={(e) => handleLineChange(line.id, 'notes', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-full md:w-auto flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeLine(line.id)}
                                                className="text-muted-foreground hover:text-red-600"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-end items-center gap-3 pt-4 mt-6 border-t">
                        {isDirty ? (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertTriangle className="h-3 w-3" /> {t('unsavedChanges')}
                            </span>
                        ) : formattedSavedAt ? (
                            <span className="text-xs text-muted-foreground">
                                {t('savedAt', { time: formattedSavedAt })}
                            </span>
                        ) : null}
                        <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? t('saving') : t('saveButton')}
                        </Button>
                    </div>
                </div>

                {/* Bulk Paste Area */}
                <div className="space-y-4 border rounded-md p-4 bg-muted/20 h-fit">
                    <h3 className="font-semibold flex items-center gap-2">
                        <CopyPlus className="h-4 w-4" /> {t('bulkPasteTitle')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {t('bulkPasteFormat')}
                    </p>
                    <Textarea
                        placeholder={t('bulkPastePlaceholder')}
                        className="font-mono text-xs min-h-[200px]"
                        value={pasteData}
                        onChange={(e) => setPasteData(e.target.value)}
                    />
                    <Button className="w-full" variant="secondary" onClick={handlePasteProcess} disabled={!pasteData.trim()}>
                        {t('bulkPasteButton')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
