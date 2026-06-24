import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserAccess } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import type { KitchenImportPayload } from '@/lib/kitchen/import-types';
import {
    buildDashboardComponentsPath,
    buildDashboardIngredientsPath,
    buildDashboardMenusPath,
} from '@/lib/constants/routes';

export async function POST(request: NextRequest) {
    const currentAccess = await getCurrentUserAccess();
    if (!currentAccess) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (currentAccess.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
        restaurantId?: string;
        previewId?: string;
        digest?: string;
        payload?: KitchenImportPayload;
    };
    if (!body.restaurantId || !body.previewId || !body.digest || !body.payload) {
        return NextResponse.json({ error: 'Incomplete import request.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('apply_kitchen_import', {
        p_restaurant_id: body.restaurantId,
        p_preview_id: body.previewId,
        p_preview_digest: body.digest,
        p_payload: body.payload,
    });

    if (error) {
        console.error('[kitchen-import-apply]', error);
        const expired = error.message.toLowerCase().includes('expired');
        await supabase
            .from('kitchen_import_runs')
            .update({ status: expired ? 'expired' : 'failed', error_summary: error.message })
            .eq('id', body.previewId);
        return NextResponse.json(
            { error: error.message || 'Failed to apply import.' },
            { status: 409 }
        );
    }

    revalidatePath(buildDashboardIngredientsPath(body.restaurantId));
    revalidatePath(buildDashboardComponentsPath(body.restaurantId));
    revalidatePath(buildDashboardMenusPath(body.restaurantId));
    revalidatePath('/kitchen/import');

    return NextResponse.json(data);
}
