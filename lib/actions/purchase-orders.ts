'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { REVALIDATE_PATHS } from '@/lib/constants/routes';
import { createClient } from '@/lib/supabase/server';
import type { PurchaseOrderStatus } from '@/lib/queries/purchase-orders';

export interface PurchaseOrderLineInput {
    ingredient_id?: string | null;
    item_name: string;
    unit?: string | null;
    category?: string | null;
    needed_quantity?: number | null;
    package_size?: number | null;
    package_label?: string | null;
    order_quantity?: number | null;
    memo?: string | null;
}

export interface PurchaseOrderLineUpdateInput {
    id: string;
    item_name: string;
    order_quantity: number | null;
    memo: string | null;
    sort_order: number;
}

export interface PurchaseOrderSettingsInput {
    company_name: string;
    postal_code?: string | null;
    address?: string | null;
    tel?: string | null;
    fax?: string | null;
    email?: string | null;
    contact_person?: string | null;
    show_postal_code: boolean;
    show_address: boolean;
    show_tel: boolean;
    show_fax: boolean;
    show_email: boolean;
    show_contact_person: boolean;
}

const DEFAULT_PURCHASE_ORDER_SUBJECT = '発注書';

async function generateDocumentNo(
    supabase: Awaited<ReturnType<typeof createClient>>,
    orderDate: string
): Promise<string> {
    const year = orderDate.slice(0, 4);
    const { data } = await supabase
        .from('purchase_orders')
        .select('document_no')
        .gte('order_date', `${year}-01-01`)
        .lte('order_date', `${year}-12-31`)
        .not('document_no', 'is', null);

    const maxSeq = ((data ?? []) as { document_no: string | null }[]).reduce((max, row) => {
        if (!row.document_no) return max;
        const parts = row.document_no.split('-');
        const seq = parseInt(parts[parts.length - 1], 10);
        return Math.max(max, isNaN(seq) ? 0 : seq);
    }, 0);

    return `PO-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
}

function normalizeRequiredText(value: string) {
    return value.trim();
}

function normalizeOptionalText(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function normalizeNumber(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    return value;
}

function purchaseOrdersPath(restaurantId: string) {
    return `/dashboard/${restaurantId}/kitchen/purchase-orders`;
}

function purchaseOrderDetailPath(restaurantId: string, id: string) {
    return `/dashboard/${restaurantId}/kitchen/purchase-orders/${id}`;
}

function revalidatePurchaseOrders(restaurantId: string, id?: string) {
    updateTag(CACHE_TAGS.PURCHASE_ORDERS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_KITCHEN_PURCHASE_ORDERS_PAGE, 'page');
    revalidatePath(purchaseOrdersPath(restaurantId), 'page');
    if (id) {
        revalidatePath(purchaseOrderDetailPath(restaurantId, id), 'page');
        revalidatePath(`/print/${restaurantId}/kitchen/purchase-orders/${id}`, 'page');
    }
}

function revalidatePurchaseOrderSettings(restaurantId: string) {
    updateTag(CACHE_TAGS.PURCHASE_ORDER_SETTINGS);
    revalidatePath('/dashboard', 'layout');
    revalidatePath(`/dashboard/${restaurantId}/kitchen/purchase-orders`, 'page');
    revalidatePath(`/print/${restaurantId}/kitchen/purchase-orders/[id]`, 'page');
}

async function touchPurchaseOrder(purchaseOrderId: string) {
    const supabase = await createClient();
    await supabase
        .from('purchase_orders')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', purchaseOrderId);
}

export async function createBlankPurchaseOrder(
    restaurantId: string,
    supplierName: string,
    orderDate: string,
    vendorId?: string | null
) {
    const supplier = normalizeRequiredText(supplierName);
    if (!supplier) return { error: 'Supplier name is required' };
    if (!orderDate) return { error: 'Order date is required' };

    const supabase = await createClient();
    const documentNo = await generateDocumentNo(supabase, orderDate);
    const { data, error } = await supabase
        .from('purchase_orders')
        .insert({
            supplier_name: supplier,
            subject: DEFAULT_PURCHASE_ORDER_SUBJECT,
            document_no: documentNo,
            order_date: orderDate,
            status: 'draft',
            source_type: 'blank',
            vendor_id: vendorId ?? null,
        })
        .select('id')
        .single();

    if (error || !data) {
        console.error('[createBlankPurchaseOrder] Failed to create purchase order', error);
        return { error: 'Failed to create purchase order' };
    }

    revalidatePurchaseOrders(restaurantId, data.id);
    return { success: true, id: data.id as string };
}

export async function createPurchaseOrderFromSummary(
    restaurantId: string,
    supplierName: string,
    orderDate: string,
    lines: PurchaseOrderLineInput[],
    vendorId?: string | null
) {
    const supplier = normalizeRequiredText(supplierName);
    if (!supplier) return { error: 'Supplier name is required' };
    if (!orderDate) return { error: 'Order date is required' };
    if (lines.length === 0) return { error: 'No lines to create' };

    const supabase = await createClient();
    const documentNo = await generateDocumentNo(supabase, orderDate);
    const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
            supplier_name: supplier,
            subject: DEFAULT_PURCHASE_ORDER_SUBJECT,
            document_no: documentNo,
            order_date: orderDate,
            status: 'draft',
            source_type: 'summary',
            vendor_id: vendorId ?? null,
        })
        .select('id')
        .single();

    if (orderError || !order) {
        console.error('[createPurchaseOrderFromSummary] Failed to create purchase order', orderError);
        return { error: 'Failed to create purchase order' };
    }

    const orderId = order.id as string;
    const lineRows = lines.map((line, index) => ({
        purchase_order_id: orderId,
        ingredient_id: line.ingredient_id ?? null,
        item_name: normalizeRequiredText(line.item_name),
        unit: normalizeOptionalText(line.unit),
        category: normalizeOptionalText(line.category),
        needed_quantity: normalizeNumber(line.needed_quantity),
        package_size: normalizeNumber(line.package_size),
        package_label: normalizeOptionalText(line.package_label),
        order_quantity: normalizeNumber(line.order_quantity),
        memo: normalizeOptionalText(line.memo),
        sort_order: index,
    }));

    const { error: linesError } = await supabase.from('purchase_order_lines').insert(lineRows);

    if (linesError) {
        console.error('[createPurchaseOrderFromSummary] Failed to create purchase order lines', linesError);
        await supabase.from('purchase_orders').delete().eq('id', orderId);
        return { error: 'Failed to create purchase order lines' };
    }

    revalidatePurchaseOrders(restaurantId, orderId);
    return { success: true, id: orderId };
}

export async function updatePurchaseOrderHeader(
    restaurantId: string,
    id: string,
    values: {
        supplier_name: string;
        subject: string;
        notes?: string | null;
        order_date: string;
        status: PurchaseOrderStatus;
    }
) {
    const supplier = normalizeRequiredText(values.supplier_name);
    const subject = normalizeRequiredText(values.subject);
    if (!supplier) return { error: 'Supplier name is required' };
    if (!subject) return { error: 'Subject is required' };
    if (!values.order_date) return { error: 'Order date is required' };

    const supabase = await createClient();
    const { error } = await supabase
        .from('purchase_orders')
        .update({
            supplier_name: supplier,
            subject,
            notes: normalizeOptionalText(values.notes),
            order_date: values.order_date,
            status: values.status,
        })
        .eq('id', id);

    if (error) {
        console.error('[updatePurchaseOrderHeader] Failed to update purchase order', error);
        return { error: 'Failed to update purchase order' };
    }

    revalidatePurchaseOrders(restaurantId, id);
    return { success: true };
}

export async function updatePurchaseOrderLines(
    restaurantId: string,
    purchaseOrderId: string,
    lines: PurchaseOrderLineUpdateInput[]
) {
    const supabase = await createClient();

    for (const line of lines) {
        const { error } = await supabase
            .from('purchase_order_lines')
            .update({
                item_name: normalizeRequiredText(line.item_name),
                order_quantity: normalizeNumber(line.order_quantity),
                memo: normalizeOptionalText(line.memo),
                sort_order: line.sort_order,
            })
            .eq('id', line.id)
            .eq('purchase_order_id', purchaseOrderId);

        if (error) {
            console.error('[updatePurchaseOrderLines] Failed to update line', error);
            return { error: 'Failed to update purchase order lines' };
        }
    }

    await touchPurchaseOrder(purchaseOrderId);
    revalidatePurchaseOrders(restaurantId, purchaseOrderId);
    return { success: true };
}

export async function addIngredientToPurchaseOrder(
    restaurantId: string,
    purchaseOrderId: string,
    ingredientId: string,
    sortOrder: number
) {
    if (!ingredientId) return { error: 'Ingredient is required' };

    const supabase = await createClient();
    const { data: ingredient, error: ingredientError } = await supabase
        .from('ingredients')
        .select('id, name, unit, category, package_size, package_label')
        .eq('id', ingredientId)
        .single();

    if (ingredientError || !ingredient) {
        console.error('[addIngredientToPurchaseOrder] Failed to fetch ingredient', ingredientError);
        return { error: 'Failed to fetch ingredient' };
    }

    const { data: line, error } = await supabase
        .from('purchase_order_lines')
        .insert({
            purchase_order_id: purchaseOrderId,
            ingredient_id: ingredient.id,
            item_name: ingredient.name,
            unit: ingredient.unit,
            category: ingredient.category,
            needed_quantity: null,
            package_size: ingredient.package_size,
            package_label: ingredient.package_label,
            order_quantity: null,
            memo: null,
            sort_order: sortOrder,
        })
        .select()
        .single();

    if (error) {
        console.error('[addIngredientToPurchaseOrder] Failed to add line', error);
        return { error: 'Failed to add ingredient' };
    }

    await touchPurchaseOrder(purchaseOrderId);
    revalidatePurchaseOrders(restaurantId, purchaseOrderId);
    return { success: true, line };
}

export async function deletePurchaseOrderLine(
    restaurantId: string,
    purchaseOrderId: string,
    lineId: string
) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('purchase_order_lines')
        .delete()
        .eq('id', lineId)
        .eq('purchase_order_id', purchaseOrderId);

    if (error) {
        console.error('[deletePurchaseOrderLine] Failed to delete line', error);
        return { error: 'Failed to delete line' };
    }

    await touchPurchaseOrder(purchaseOrderId);
    revalidatePurchaseOrders(restaurantId, purchaseOrderId);
    return { success: true };
}

export async function deletePurchaseOrder(restaurantId: string, id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[deletePurchaseOrder] Failed to delete purchase order', error);
        return { error: 'Failed to delete purchase order' };
    }

    revalidatePurchaseOrders(restaurantId);
    return { success: true };
}

export async function updatePurchaseOrderSettings(
    restaurantId: string,
    values: PurchaseOrderSettingsInput
) {
    const companyName = normalizeRequiredText(values.company_name);
    if (!companyName) return { error: 'Company name is required' };

    const supabase = await createClient();
    const { error } = await supabase
        .from('purchase_order_settings')
        .upsert(
            {
                restaurant_id: restaurantId,
                company_name: companyName,
                postal_code: normalizeOptionalText(values.postal_code),
                address: normalizeOptionalText(values.address),
                tel: normalizeOptionalText(values.tel),
                fax: normalizeOptionalText(values.fax),
                email: normalizeOptionalText(values.email),
                contact_person: normalizeOptionalText(values.contact_person),
                show_postal_code: values.show_postal_code,
                show_address: values.show_address,
                show_tel: values.show_tel,
                show_fax: values.show_fax,
                show_email: values.show_email,
                show_contact_person: values.show_contact_person,
            },
            { onConflict: 'restaurant_id' }
        );

    if (error) {
        console.error('[updatePurchaseOrderSettings] Failed to update settings', error);
        return { error: 'Failed to update purchase order settings' };
    }

    revalidatePurchaseOrderSettings(restaurantId);
    return { success: true };
}
