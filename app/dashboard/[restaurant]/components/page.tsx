import { getComponents } from '@/lib/queries/components';
import { ComponentsList } from '@/components/kitchen/components-list';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default async function ComponentsPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    const components = await getComponents(restaurant);

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Components</h2>
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href={`/dashboard/${restaurant}/components/new`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Component
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <ComponentsList initialData={components} restaurantId={restaurant} />
            </div>
        </div>
    );
}
