import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { createCacheClient } from '@/lib/supabase/cache';

export interface Vendor {
    id: string;
    name: string;
    email: string | null;
    tel: string | null;
    fax: string | null;
    created_at: string;
    updated_at: string;
}

export const getVendors = unstable_cache(
    async (): Promise<Vendor[]> => {
        const supabase = createCacheClient();
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('[getVendors] Failed to load vendors', error);
            return [];
        }

        return (data ?? []) as Vendor[];
    },
    ['vendors'],
    { tags: [CACHE_TAGS.VENDORS], revalidate: 3600 }
);
