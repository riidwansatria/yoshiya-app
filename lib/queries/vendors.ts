import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export interface Vendor {
    id: string;
    name: string;
    email: string | null;
    tel: string | null;
    fax: string | null;
    created_at: string;
    updated_at: string;
}

export const getVendors = cache(
    async (): Promise<Vendor[]> => {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('[getVendors] Failed to load vendors', error);
            return [];
        }

        return (data ?? []) as Vendor[];
    }
);
