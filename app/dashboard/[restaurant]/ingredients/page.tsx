import { getIngredients } from '@/lib/queries/ingredients';
import { IngredientsTable } from '@/components/kitchen/ingredients-table';

export default async function IngredientsPage() {
    const ingredients = await getIngredients();

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Ingredients</h2>
            </div>
            <div className="flex-1 min-h-0">
                <IngredientsTable initialData={ingredients} />
            </div>
        </div>
    );
}
