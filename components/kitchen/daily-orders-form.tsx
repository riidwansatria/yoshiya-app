'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash, Plus, CopyPlus, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { Menu } from '@/lib/queries/menus';
import { DailyOrder } from '@/lib/queries/daily-orders';
import { saveDailyOrders } from '@/lib/actions/daily-orders';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Very basic fuzzy search for demonstration purposes: case-insensitive substring match
function fuzzyMatchMenu(query: string, menus: Menu[]): Menu | null {
    const normalizedQuery = query.trim().toLowerCase();

    // Exact match first
    const exact = menus.find(m => m.name.toLowerCase() === normalizedQuery);
    if (exact) return exact;

    // Substring match
    const substring = menus.find(m => m.name.toLowerCase().includes(normalizedQuery));
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
    const [isSaving, setIsSaving] = useState(false);
    const [dateStr, setDateStr] = useState(targetDate);
    const [pasteData, setPasteData] = useState('');

    // Local state for the editable lines
    const [orderLines, setOrderLines] = useState<{ id: string; menu_id: string; quantity: number; notes: string }[]>(
        initialOrders.map(o => ({
            id: crypto.randomUUID(),
            menu_id: o.menu_id,
            quantity: o.quantity,
            notes: o.notes || ''
        }))
    );

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setDateStr(newDate);
        // Reload page with new date in search params
        router.push(`/dashboard/${restaurantId}/kitchen/orders?date=${newDate}`);
    };

    const handleLineChange = (id: string, field: 'menu_id' | 'quantity' | 'notes', value: any) => {
        setOrderLines(prev => prev.map(line =>
            line.id === id ? { ...line, [field]: value } : line
        ));
    };

    const addLine = () => {
        setOrderLines(prev => [...prev, { id: crypto.randomUUID(), menu_id: '', quantity: 1, notes: '' }]);
    };

    const removeLine = (id: string) => {
        setOrderLines(prev => prev.filter(line => line.id !== id));
    };

    const handlePasteProcess = () => {
        if (!pasteData.trim()) return;

        const lines = pasteData.split('\n');
        const newLines: typeof orderLines = [];
        let unmappedCount = 0;

        lines.forEach(lineText => {
            const parts = lineText.split('\t');
            // Assume Format: [Menu Name] [Tab] [Quantity] [Tab] [Notes - Optional]
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
                            notes: notesRaw.trim()
                        });
                    } else {
                        console.warn(`Could not map menu name from paste: "${menuNameRaw}"`);
                        unmappedCount++;
                        // Still add line, but leave menu_id blank for manual review
                        newLines.push({
                            id: crypto.randomUUID(),
                            menu_id: '', // Requires manual selection
                            quantity: qtyRaw,
                            notes: `Pasted as: ${menuNameRaw} - ${notesRaw}`.trim()
                        });
                    }
                }
            }
        });

        if (newLines.length > 0) {
            setOrderLines(prev => [...prev, ...newLines]);
            setPasteData('');
            if (unmappedCount > 0) {
                toast.warning(`${unmappedCount} rows couldn't be automatically mapped to menus. Please review them.`);
            } else {
                toast.success(`Successfully parsed ${newLines.length} rows.`);
            }
        } else {
            toast.error("Could not parse data. Ensure it is Tab-separated (e.g. copied directly from Excel/Sheets).");
        }
    };

    const handleSave = async () => {
        // Validation
        const invalidLines = orderLines.filter(line => !line.menu_id || line.quantity <= 0);
        if (invalidLines.length > 0) {
            toast.error("Please ensure all rows have a menu selected and quantity > 0.");
            return;
        }

        setIsSaving(true);
        try {
            const result = await saveDailyOrders(restaurantId, dateStr, orderLines.map(line => ({
                menu_id: line.menu_id,
                quantity: line.quantity,
                notes: line.notes
            })));

            if (result.error) throw new Error(result.error);

            toast.success("Daily orders saved successfully.");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
                <label className="font-semibold whitespace-nowrap">Target Date:</label>
                <Input
                    type="date"
                    value={dateStr}
                    onChange={handleDateChange}
                    className="w-auto"
                />
                <span className="text-sm text-muted-foreground ml-auto">
                    Currently editing orders for {format(parseISO(dateStr), 'EEEE, MMMM do, yyyy')}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
                {/* Editor Area */}
                <div className="space-y-4 border rounded-md p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Order Lines</h3>
                        <Button variant="outline" size="sm" onClick={addLine}>
                            <Plus className="h-4 w-4 mr-2" /> Add Line
                        </Button>
                    </div>

                    {orderLines.length === 0 ? (
                        <div className="text-center p-8 border border-dashed rounded-md bg-muted/50">
                            <p className="text-muted-foreground text-sm">No orders recorded for this date.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex gap-4 text-sm font-medium text-muted-foreground px-1 hidden md:flex">
                                <div className="flex-[2]">Menu Item</div>
                                <div className="w-[100px]">Qty</div>
                                <div className="flex-[2]">Notes</div>
                                <div className="w-10"></div>
                            </div>

                            {orderLines.map((line, index) => (
                                <div key={line.id} className="flex flex-col md:flex-row gap-4 items-start bg-background p-2 md:p-1 border md:border-transparent rounded-md">
                                    <div className="flex-[2] w-full">
                                        <Select
                                            value={line.menu_id}
                                            onValueChange={(val) => handleLineChange(line.id, 'menu_id', val)}
                                        >
                                            <SelectTrigger className={!line.menu_id ? 'border-red-500 bg-red-50' : ''}>
                                                <SelectValue placeholder="Select menu..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableMenus.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-full md:w-[100px]">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={line.quantity}
                                            onChange={(e) => handleLineChange(line.id, 'quantity', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="flex-[2] w-full">
                                        <Input
                                            placeholder="Optional notes"
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
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end pt-4 mt-6 border-t">
                        <Button onClick={handleSave} disabled={isSaving || orderLines.length === 0}>
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Orders'}
                        </Button>
                    </div>
                </div>

                {/* Bulk Paste Area */}
                <div className="space-y-4 border rounded-md p-4 bg-muted/20 h-fit">
                    <h3 className="font-semibold flex items-center gap-2">
                        <CopyPlus className="h-4 w-4" /> Bulk Paste
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Copy columns directly from Google Sheets or Excel and paste them here. <br />
                        Expected format: <code>[Menu Name] [Tab] [Quantity]</code>.
                    </p>
                    <Textarea
                        placeholder="Paste tab-separated data here..."
                        className="font-mono text-xs min-h-[200px]"
                        value={pasteData}
                        onChange={(e) => setPasteData(e.target.value)}
                    />
                    <Button className="w-full" variant="secondary" onClick={handlePasteProcess} disabled={!pasteData.trim()}>
                        Process Paste
                    </Button>
                </div>
            </div>
        </div>
    );
}
