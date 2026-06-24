'use server';

import { createHash } from 'node:crypto';

import { getCurrentUserAccess } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import type { KitchenImportPayload } from '@/lib/kitchen/import-types';

export async function createAndApplyKitchenImport({
    restaurantId,
    payload,
    operationCounts,
    beforeSnapshot,
    afterSnapshot,
}: {
    restaurantId: string;
    payload: KitchenImportPayload;
    operationCounts: Record<string, number>;
    beforeSnapshot: Record<string, unknown>;
    afterSnapshot: Record<string, unknown>;
}) {
    const currentAccess = await getCurrentUserAccess();
    if (!currentAccess) {
        return { error: 'Unauthorized' };
    }
    const supabase = await createClient();
    const sourceDigest = createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');
    const { data: run, error: runError } = await supabase
        .from('kitchen_import_runs')
        .insert({
            restaurant_id: restaurantId,
            actor_user_id: currentAccess.user.id,
            schema_version: 1,
            source_digest: sourceDigest,
            status: 'previewed',
            operation_counts: operationCounts,
            issues: [],
            normalized_payload: payload,
            before_snapshot: beforeSnapshot,
            after_snapshot: afterSnapshot,
        })
        .select('id')
        .single();

    if (runError || !run) {
        console.error('[createAndApplyKitchenImport] preview insert failed', runError);
        return { error: 'Failed to prepare atomic import.' };
    }

    const { data, error } = await supabase.rpc('apply_kitchen_import', {
        p_restaurant_id: restaurantId,
        p_preview_id: run.id,
        p_preview_digest: sourceDigest,
        p_payload: payload,
    });
    if (error) {
        console.error('[createAndApplyKitchenImport] apply failed', error);
        await supabase
            .from('kitchen_import_runs')
            .update({ status: 'failed', error_summary: error.message })
            .eq('id', run.id);
        return { error: error.message || 'Failed to apply import.' };
    }
    return data as { success: true; counts: Record<string, number> };
}
