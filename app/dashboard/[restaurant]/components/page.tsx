import { getComponents } from '@/lib/queries/components';
import { getMenus } from '@/lib/queries/menus';
import { ComponentsList } from '@/components/kitchen/components-list';
import { Button } from '@/components/ui/button';
import { PlusCircle, LayoutList } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function ComponentsPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    const t = await getTranslations('kitchen');
    const [components, menus] = await Promise.all([
        getComponents(restaurant),
        getMenus(restaurant, { includeMenuComponents: true, includeComponentDetails: true }),
    ]);

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('pages.components')}</h2>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/${restaurant}/components/matrix`}>
                            <LayoutList className="mr-2 h-4 w-4" />
                            {t('pages.matrixExport')}
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/dashboard/${restaurant}/components/new`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('pages.newComponentButton')}
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <ComponentsList initialData={components} menus={menus} restaurantId={restaurant} />
            </div>
        </div>
    );
}
