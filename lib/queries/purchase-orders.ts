import { unstable_cache } from 'next/cache';

import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { createCacheClient } from '@/lib/supabase/cache';
import { createClient } from '@/lib/supabase/server';

export type PurchaseOrderStatus = 'draft' | 'done';
export type PurchaseOrderSourceType = 'blank' | 'summary';

export interface PurchaseOrderLine {
    id: string;
    purchase_order_id: string;
    ingredient_id: string | null;
    item_name: string;
    unit: string | null;
    category: string | null;
    needed_quantity: number | null;
    package_size: number | null;
    package_label: string | null;
    order_quantity: number | null;
    memo: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface PurchaseOrder {
    id: string;
    restaurant_id: string;
    supplier_name: string;
    subject: string;
    notes: string | null;
    order_date: string;
    status: PurchaseOrderStatus;
    source_type: PurchaseOrderSourceType;
    created_at: string;
    updated_at: string;
}

export interface PurchaseOrderListItem extends PurchaseOrder {
    line_count: number;
}

export interface PurchaseOrderDetail extends PurchaseOrder {
    lines: PurchaseOrderLine[];
}

export interface PurchaseOrderSettings {
    restaurant_id: string;
    company_name: string;
    postal_code: string | null;
    address: string | null;
    tel: string | null;
    fax: string | null;
    email: string | null;
    contact_person: string | null;
    show_postal_code: boolean;
    show_address: boolean;
    show_tel: boolean;
    show_fax: boolean;
    show_email: boolean;
    show_contact_person: boolean;
    created_at: string;
    updated_at: string;
}

type PurchaseOrderLineCountRow = PurchaseOrder & {
    purchase_order_lines?: { count: number }[];
};

type PurchaseOrderDetailRow = PurchaseOrder & {
    purchase_order_lines?: PurchaseOrderLine[];
};

function mapListRow(row: PurchaseOrderLineCountRow): PurchaseOrderListItem {
    return {
        ...row,
        line_count: row.purchase_order_lines?.[0]?.count ?? 0,
    };
}

export const getPurchaseOrders = unstable_cache(
    async (restaurantId: string): Promise<PurchaseOrderListItem[]> => {
        const supabase = createCacheClient();
        const { data, error } = await supabase
            .from('purchase_orders')
            .select('*, purchase_order_lines(count)')
            .eq('restaurant_id', restaurantId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('[getPurchaseOrders] Failed to load purchase orders', error);
            return [];
        }

        return ((data ?? []) as PurchaseOrderLineCountRow[]).map(mapListRow);
    },
    ['purchase-orders-by-restaurant'],
    { tags: [CACHE_TAGS.PURCHASE_ORDERS], revalidate: 3600 }
);

export const getAllPurchaseOrderSettings = unstable_cache(
    async (): Promise<PurchaseOrderSettings[]> => {
        const supabase = createCacheClient();
        const { data, error } = await supabase
            .from('purchase_order_settings')
            .select('*')
            .order('restaurant_id', { ascending: true });

        if (error) {
            console.error('[getAllPurchaseOrderSettings] Failed to load settings', error);
            return [];
        }

        return (data ?? []) as PurchaseOrderSettings[];
    },
    ['purchase-order-settings-all'],
    { tags: [CACHE_TAGS.PURCHASE_ORDER_SETTINGS], revalidate: 3600 }
);

export async function getPurchaseOrderSettings(
    restaurantId: string
): Promise<PurchaseOrderSettings | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('purchase_order_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

    if (error) {
        console.error('[getPurchaseOrderSettings] Failed to load settings', error);
        return null;
    }

    return (data ?? null) as PurchaseOrderSettings | null;
}

export async function getPurchaseOrderYearSequence(
    restaurantId: string,
    order: Pick<PurchaseOrder, 'id' | 'order_date'>
): Promise<number> {
    const year = order.order_date.slice(0, 4);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, order_date, created_at')
        .eq('restaurant_id', restaurantId)
        .gte('order_date', `${year}-01-01`)
        .lte('order_date', `${year}-12-31`)
        .order('order_date', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        console.error('[getPurchaseOrderYearSequence] Failed to load yearly sequence', error);
        return 1;
    }

    const index = (data ?? []).findIndex((row) => row.id === order.id);
    return index >= 0 ? index + 1 : 1;
}

export async function getPurchaseOrderById(
    restaurantId: string,
    id: string
): Promise<PurchaseOrderDetail | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, purchase_order_lines(*)')
        .eq('restaurant_id', restaurantId)
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('[getPurchaseOrderById] Failed to load purchase order', error);
        return null;
    }

    const row = data as PurchaseOrderDetailRow;
    return {
        ...row,
        lines: (row.purchase_order_lines ?? []).sort((a, b) => {
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
            return a.created_at.localeCompare(b.created_at);
        }),
    };
}
