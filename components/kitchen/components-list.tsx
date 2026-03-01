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
import { useCallback, useState, Fragment } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

    const toggleRow = useCallback((componentId: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(componentId)) {
                next.delete(componentId);
            } else {
                next.add(componentId);
            }
            return next;
        });
    }, []);

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0">
            <div className="rounded-md border flex-1 overflow-y-auto min-h-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Yield (Servings)</TableHead>
                            <TableHead>Ingredients</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No components found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialData.map((component) => {
                                const isExpanded = expandedRows.has(component.id);
                                return (
                                    <Fragment key={component.id}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => toggleRow(component.id)}
                                        >
                                            <TableCell>
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={`/dashboard/${restaurantId}/components/${component.id}`}
                                                    className="hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {component.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="max-w-[300px] truncate text-muted-foreground">
                                                {component.description || '-'}
                                            </TableCell>
                                            <TableCell>{component.yield_servings}</TableCell>
                                            <TableCell>{component.component_ingredients?.length || 0}</TableCell>
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

                                        {isExpanded && (
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableCell colSpan={6} className="p-0 border-b">
                                                    <div className="p-4 pl-14">
                                                        {(!component.component_ingredients || component.component_ingredients.length === 0) ? (
                                                            <p className="text-sm text-muted-foreground italic">No ingredients have been mapped to this component yet.</p>
                                                        ) : (
                                                            <ul className="space-y-2">
                                                                {component.component_ingredients.map(ci => (
                                                                    <li key={ci.ingredient_id} className="text-sm flex items-center gap-3">
                                                                        <span className="inline-block w-[3em] text-right font-medium text-foreground tabular-nums">
                                                                            {ci.qty_per_serving}
                                                                        </span>
                                                                        <span className="text-muted-foreground text-xs">
                                                                            {ci.ingredients?.unit || ''}
                                                                        </span>
                                                                        <span className="text-foreground">
                                                                            {ci.ingredients?.name || 'Unknown Ingredient'}
                                                                        </span>
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
