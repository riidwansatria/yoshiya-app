'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { createClient } from '@/lib/supabase/server';
import { requirePermission } from '@/lib/auth/server';

function normalizeRequiredText(value: string) {
    return value.trim();
}

function normalizeOptionalText(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function revalidateVendors() {
    updateTag(CACHE_TAGS.VENDORS);
    revalidatePath('/', 'layout');
}

export async function createVendor(values: {
    name: string;
    email?: string | null;
    tel?: string | null;
    fax?: string | null;
}) {
    await requirePermission('procurement', 'procurement.create');
    const name = normalizeRequiredText(values.name);
    if (!name) return { error: 'Vendor name is required' };

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('vendors')
        .insert({
            name,
            email: normalizeOptionalText(values.email),
            tel: normalizeOptionalText(values.tel),
            fax: normalizeOptionalText(values.fax),
        })
        .select()
        .single();

    if (error || !data) {
        console.error('[createVendor] Failed to create vendor', error);
        return { error: 'Failed to create vendor' };
    }

    revalidateVendors();
    return { success: true, data };
}

export async function updateVendor(
    id: string,
    values: { name?: string; email?: string | null; tel?: string | null; fax?: string | null }
) {
    await requirePermission('procurement', 'procurement.update');
    const supabase = await createClient();
    const update: Record<string, unknown> = {};

    if (values.name !== undefined) {
        const name = normalizeRequiredText(values.name);
        if (!name) return { error: 'Vendor name is required' };
        update.name = name;
    }
    if ('email' in values) update.email = normalizeOptionalText(values.email);
    if ('tel' in values) update.tel = normalizeOptionalText(values.tel);
    if ('fax' in values) update.fax = normalizeOptionalText(values.fax);

    const { error } = await supabase.from('vendors').update(update).eq('id', id);

    if (error) {
        console.error('[updateVendor] Failed to update vendor', error);
        return { error: 'Failed to update vendor' };
    }

    revalidateVendors();
    return { success: true };
}

export async function deleteVendor(id: string) {
    await requirePermission('procurement', 'procurement.delete');
    const supabase = await createClient();
    const { error } = await supabase.from('vendors').delete().eq('id', id);

    if (error) {
        console.error('[deleteVendor] Failed to delete vendor', error);
        return { error: 'Failed to delete vendor' };
    }

    revalidateVendors();
    return { success: true };
}
