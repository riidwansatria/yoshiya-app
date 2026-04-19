import { createClient } from '@/lib/supabase/client';

const BUCKET = 'yoshiya-assets';
const BUCKET_PREFIX = 'menus';
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1200;
const OUTPUT_QUALITY = 0.85;

export type UploadResult =
    | { ok: true; publicUrl: string }
    | { ok: false; error: string };

export function validateMenuImageFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
        return 'Only JPG, PNG, or WebP images are allowed';
    }
    if (file.size > MAX_BYTES) {
        return 'Image must be 5MB or smaller';
    }
    return null;
}

async function resizeImage(file: File): Promise<{ blob: Blob; contentType: string; extension: string }> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap.close();
        return { blob: file, contentType: file.type, extension: extensionFromType(file.type) };
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', OUTPUT_QUALITY);
    });

    if (blob && blob.type === 'image/webp') {
        return { blob, contentType: 'image/webp', extension: 'webp' };
    }
    return { blob: file, contentType: file.type, extension: extensionFromType(file.type) };
}

function extensionFromType(type: string): string {
    if (type === 'image/jpeg') return 'jpg';
    if (type === 'image/png') return 'png';
    if (type === 'image/webp') return 'webp';
    return 'bin';
}

export async function uploadMenuImage(file: File, restaurantId: string): Promise<UploadResult> {
    const validationError = validateMenuImageFile(file);
    if (validationError) {
        return { ok: false, error: validationError };
    }

    const supabase = createClient();
    const { blob, contentType, extension } = await resizeImage(file);
    const path = `${BUCKET_PREFIX}/${restaurantId}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType, upsert: false });

    if (error) {
        console.error('Menu image upload failed:', error);
        return { ok: false, error: 'Failed to upload image' };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, publicUrl: data.publicUrl };
}

export async function deleteMenuImage(publicUrl: string): Promise<void> {
    const marker = `/${BUCKET}/`;
    const index = publicUrl.indexOf(marker);
    if (index === -1) return;
    const path = publicUrl.slice(index + marker.length);
    if (!path.startsWith(`${BUCKET_PREFIX}/`)) return;

    const supabase = createClient();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
        console.error('Menu image delete failed:', error);
    }
}
