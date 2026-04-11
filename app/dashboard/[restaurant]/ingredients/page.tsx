import { getIngredients, getDistinctStores } from '@/lib/queries/ingredients';
import { getComponents } from '@/lib/queries/components';
import { IngredientsTable } from '@/components/kitchen/ingredients-table';
import { getTranslations } from 'next-intl/server';

export default async function IngredientsPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    const t = await getTranslations('kitchen');
    const [ingredients, stores, components] = await Promise.all([
        getIngredients(),
        getDistinctStores(),
        getComponents(restaurant),
    ]);

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('pages.ingredients')}</h2>
            </div>
            <div className="flex-1 min-h-0">
                <IngredientsTable
                    initialData={ingredients}
                    initialStores={stores}
                    components={components}
                    restaurantId={restaurant}
                />
            </div>
        </div>
    );
}
