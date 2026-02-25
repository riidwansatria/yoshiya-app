'use client';

import { RecipeComponent } from '@/lib/queries/components';
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
import { DeleteComponentDialog } from './component-dialogs';
import { duplicateComponent } from '@/lib/actions/components';

export function ComponentsList({
    initialData,
    restaurantId,
}: {
    initialData: RecipeComponent[];
    restaurantId: string;
}) {
    const router = useRouter();
    const [deletingComponent, setDeletingComponent] = useState<RecipeComponent | null>(null);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0">
            <div className="rounded-md border flex-1 overflow-y-auto min-h-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Yield (Servings)</TableHead>
                            <TableHead>Ingredients Count</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No components found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialData.map((component) => (
                                <TableRow key={component.id}>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={`/dashboard/${restaurantId}/components/${component.id}`}
                                            className="hover:underline"
                                        >
                                            {component.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                                        {component.description || '-'}
                                    </TableCell>
                                    <TableCell>{component.yield_servings}</TableCell>
                                    <TableCell>{component.component_ingredients?.length || 0}</TableCell>
                                    <TableCell>
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
                                                        router.push(`/dashboard/${restaurantId}/components/${component.id}`)
                                                    }
                                                >
                                                    View / Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    disabled={duplicatingId === component.id}
                                                    onClick={async () => {
                                                        setDuplicatingId(component.id);
                                                        const result = await duplicateComponent(component.id);
                                                        setDuplicatingId(null);
                                                        if (result?.data?.id) {
                                                            router.push(`/dashboard/${restaurantId}/components/${result.data.id}`);
                                                        }
                                                    }}
                                                >
                                                    {duplicatingId === component.id ? 'Duplicating...' : 'Duplicate'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => setDeletingComponent(component)}
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

            {deletingComponent && (
                <DeleteComponentDialog
                    component={deletingComponent}
                    open={!!deletingComponent}
                    onOpenChange={(open: boolean) => !open && setDeletingComponent(null)}
                />
            )}
        </div>
    );
}
