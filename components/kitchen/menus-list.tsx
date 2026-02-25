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
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteMenuDialog } from './menu-dialogs';

export function MenusList({
    initialData,
    restaurantId,
}: {
    initialData: Menu[];
    restaurantId: string;
}) {
    const router = useRouter();
    const [deletingMenu, setDeletingMenu] = useState<Menu | null>(null);

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Season</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No menus found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialData.map((menu) => (
                                <TableRow key={menu.id}>
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
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        router.push(`/dashboard/${restaurantId}/menus/${menu.id}`)
                                                    }
                                                >
                                                    View / Edit
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
                            ))
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
