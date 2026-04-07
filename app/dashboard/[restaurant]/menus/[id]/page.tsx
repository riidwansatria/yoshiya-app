import { getMenuById } from '@/lib/queries/menus';
import { getComponentOptions } from '@/lib/queries/components';
import { getMenuTags } from '@/lib/queries/menu-tags';
import { MenuForm } from '@/components/kitchen/menu-form';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export default async function MenuDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>;
}) {
    const { restaurant, id } = await params;
    const isNew = id === 'new';
    const t = await getTranslations('kitchen');

    const [menu, components, availableTags] = await Promise.all([
        isNew ? null : getMenuById(id),
        getComponentOptions(restaurant),
        getMenuTags(),
    ]);

    if (!isNew && !menu) {
        notFound();
    }

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">
                    {isNew ? t('pages.newMenu') : t('pages.editMenu')}
                </h2>
            </div>
            <div className="flex-1 min-h-0">
                <MenuForm
                    initialData={menu}
                    availableComponents={components}
                    availableTags={availableTags}
                    restaurantId={restaurant}
                />
            </div>
        </div>
    );
}
