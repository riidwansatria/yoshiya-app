'use client';

import { Menu } from '@/lib/queries/menus';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCallback, useState, useMemo, Fragment } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteMenuDialog } from './menu-dialogs';
import { duplicateMenu } from '@/lib/actions/menus';

export function MenusList({
    initialData,
    restaurantId,
}: {
    initialData: Menu[];
    restaurantId: string;
}) {
    const router = useRouter();
    const [deletingMenu, setDeletingMenu] = useState<Menu | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return initialData;
        return initialData.filter((m) =>
            m.name.toLowerCase().includes(q) ||
            (m.season ?? '').toLowerCase().includes(q) ||
            (m.description ?? '').toLowerCase().includes(q) ||
            (m.menu_components ?? []).some((menuComponent) =>
                (menuComponent.components?.name ?? '').toLowerCase().includes(q)
            )
        );
    }, [initialData, search]);

    const toggleRow = useCallback((menuId: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(menuId)) {
                next.delete(menuId);
            } else {
                next.add(menuId);
            }
            return next;
        });
    }, []);

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0">
            <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search menus..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                />
            </div>
            <div className="rounded-md border flex-1 overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Season</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {search ? `No menus matching "${search}".` : 'No menus found.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((menu) => {
                                const isExpanded = expandedRows.has(menu.id);
                                return (
                                    <Fragment key={menu.id}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => toggleRow(menu.id)}
                                        >
                                            <TableCell>
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {menu.color && (
                                                        <div
                                                            className="h-3 w-3 rounded-full"
                                                            style={{ backgroundColor: menu.color }}
                                                        />
                                                    )}
                                                    <Link
                                                        href={`/dashboard/${restaurantId}/menus/${menu.id}`}
                                                        className="hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {menu.name}
                                                    </Link>
                                                </div>
                                            </TableCell>
                                            <TableCell>{menu.season || '-'}</TableCell>
                                            <TableCell>
                                                {menu.price !== null ? `¥${menu.price.toLocaleString()}` : '-'}
                                            </TableCell>
                                            <TableCell className="max-w-[300px] truncate text-muted-foreground">
                                                {menu.description || '-'}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                router.push(`/dashboard/${restaurantId}/menus/${menu.id}`)
                                                            }
                                                        >
                                                            View / Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            disabled={duplicatingId === menu.id}
                                                            onClick={async () => {
                                                                setDuplicatingId(menu.id);
                                                                const result = await duplicateMenu(menu.id);
                                                                setDuplicatingId(null);
                                                                if (result?.data?.id) {
                                                                    router.push(`/dashboard/${restaurantId}/menus/${result.data.id}`);
                                                                }
                                                            }}
                                                        >
                                                            {duplicatingId === menu.id ? 'Duplicating...' : 'Duplicate'}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => setDeletingMenu(menu)}
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>

                                        {isExpanded && (
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableCell colSpan={6} className="p-0 border-b">
                                                    <div className="p-4 pl-14">

                                                        {(!menu.menu_components || menu.menu_components.length === 0) ? (
                                                            <p className="text-sm text-muted-foreground italic">No components have been mapped to this menu yet.</p>
                                                        ) : (
                                                            <ul className="space-y-2">
                                                                {menu.menu_components.map(mc => (
                                                                    <li key={mc.component_id} className="text-sm flex items-center gap-3">
                                                                        <span className="inline-block w-[1.5em] text-right font-medium text-foreground">
                                                                            {mc.qty_per_order}x
                                                                        </span>
                                                                        {mc.components?.id ? (
                                                                            <Link
                                                                                href={`/dashboard/${restaurantId}/components/${mc.components.id}`}
                                                                                className="text-foreground hover:underline"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {mc.components.name}
                                                                            </Link>
                                                                        ) : (
                                                                            <span className="text-foreground">
                                                                                {mc.components?.name || 'Unknown Component'}
                                                                            </span>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {deletingMenu && (
                <DeleteMenuDialog
                    menu={deletingMenu}
                    open={!!deletingMenu}
                    onOpenChange={(open: boolean) => !open && setDeletingMenu(null)}
                />
            )}
        </div>
    );
}
