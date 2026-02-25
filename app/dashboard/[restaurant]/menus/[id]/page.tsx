import { getMenuById } from '@/lib/queries/menus';
import { getComponents } from '@/lib/queries/components';
import { MenuForm } from '@/components/kitchen/menu-form';
import { notFound } from 'next/navigation';

export default async function MenuDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>;
}) {
    const { restaurant, id } = await params;
    const isNew = id === 'new';

    const [menu, components] = await Promise.all([
        isNew ? null : getMenuById(id),
        getComponents(restaurant),
    ]);

    if (!isNew && !menu) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">
                    {isNew ? 'New Menu' : 'Edit Menu'}
                </h2>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <MenuForm
                    initialData={menu}
                    availableComponents={components}
                    restaurantId={restaurant}
                />
            </div>
        </div>
    );
}
