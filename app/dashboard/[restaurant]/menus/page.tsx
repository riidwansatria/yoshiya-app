import { getMenus } from '@/lib/queries/menus';
import { MenusList } from '@/components/kitchen/menus-list';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default async function MenusPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    const menus = await getMenus(restaurant);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Menus</h2>
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href={`/dashboard/${restaurant}/menus/new`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Menu
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <MenusList initialData={menus} restaurantId={restaurant} />
            </div>
        </div>
    );
}
