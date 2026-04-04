import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import type { KitchenClient } from '@/lib/queries/kitchen';

export type KitchenRealtimeScope =
    | 'ingredients-list'
    | 'components-list'
    | 'ingredient-record'
    | 'component-record';

type KitchenRealtimeChange = RealtimePostgresChangesPayload<Record<string, unknown>> & {
    table: string;
};

type KitchenRealtimeSubscription = {
    table: string;
    filter?: string;
};

interface SubscribeToKitchenScopeArgs {
    supabase: KitchenClient;
    scope: KitchenRealtimeScope;
    restaurantId?: string;
    recordId?: string;
    onChange: (change: KitchenRealtimeChange) => void;
}

function buildSubscriptions({
    scope,
    restaurantId,
    recordId,
}: Omit<SubscribeToKitchenScopeArgs, 'supabase' | 'onChange'>): KitchenRealtimeSubscription[] {
    switch (scope) {
        case 'ingredients-list':
            return [
                { table: 'ingredients' },
                { table: 'components', filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined },
                { table: 'component_ingredients' },
            ];
        case 'components-list':
            return [
                { table: 'components', filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined },
                { table: 'component_ingredients' },
                { table: 'ingredients' },
                { table: 'menus', filter: restaurantId ? `restaurant_id=eq.${restaurantId}` : undefined },
                { table: 'menu_components' },
            ];
        case 'ingredient-record':
            return recordId ? [{ table: 'ingredients', filter: `id=eq.${recordId}` }] : [];
        case 'component-record':
            return [
                recordId ? { table: 'components', filter: `id=eq.${recordId}` } : null,
                recordId ? { table: 'component_ingredients', filter: `component_id=eq.${recordId}` } : null,
                { table: 'ingredients' },
            ].filter((subscription): subscription is KitchenRealtimeSubscription => subscription !== null);
        default:
            return [];
    }
}

export function subscribeToKitchenScope({
    supabase,
    scope,
    restaurantId,
    recordId,
    onChange,
}: SubscribeToKitchenScopeArgs) {
    const subscriptions = buildSubscriptions({ scope, restaurantId, recordId });
    const channel = supabase.channel(
        `kitchen:${scope}:${restaurantId ?? recordId ?? 'global'}:${Math.random().toString(36).slice(2)}`
    );

    subscriptions.forEach(({ table, filter }) => {
        channel.on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table,
                filter,
            },
            (payload) => {
                onChange({
                    ...payload,
                    table,
                });
            }
        );
    });

    channel.subscribe();

    return channel;
}
