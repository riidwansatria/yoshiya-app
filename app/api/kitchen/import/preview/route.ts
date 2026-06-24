import AdmZip from 'adm-zip';
import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserAccess } from '@/lib/auth/server';
import {
    KITCHEN_IMPORT_FILE_NAMES,
    type KitchenImportFileName,
    type KitchenImportPreview,
} from '@/lib/kitchen/import-types';
import { validateKitchenImportFiles } from '@/lib/kitchen/import-validation';
import { createClient } from '@/lib/supabase/server';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_FILE_NAMES = new Set<string>([
    ...KITCHEN_IMPORT_FILE_NAMES,
    'manifest.json',
    'README.md',
]);

export async function POST(request: NextRequest) {
    const currentAccess = await getCurrentUserAccess();
    if (!currentAccess) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (currentAccess.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const access = {
        role: currentAccess.role,
        modules: currentAccess.modules,
        permissions: currentAccess.permissions,
    };

    const formData = await request.formData();
    const restaurantId = String(formData.get('restaurantId') ?? '');
    if (!restaurantId) {
        return NextResponse.json({ error: 'Missing restaurant' }, { status: 400 });
    }

    const uploads = formData.getAll('files').filter((value): value is File => value instanceof File);
    if (uploads.length === 0) {
        return NextResponse.json({ error: 'Select a ZIP or CSV files.' }, { status: 400 });
    }
    if (uploads.length > 6) {
        return NextResponse.json({ error: 'Upload at most five CSV files plus manifest.json.' }, { status: 400 });
    }

    try {
        const files = await extractUploadFiles(uploads);
        if (!KITCHEN_IMPORT_FILE_NAMES.some((name) => files[name] !== undefined)) {
            return NextResponse.json({ error: 'No supported CSV files were found.' }, { status: 400 });
        }

        const validated = await validateKitchenImportFiles({
            restaurantId,
            files,
            access,
        });
        const supabase = await createClient();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const { data: run, error } = await supabase
            .from('kitchen_import_runs')
            .insert({
                restaurant_id: restaurantId,
                actor_user_id: currentAccess.user.id,
                schema_version: 1,
                source_digest: validated.sourceDigest,
                status: 'previewed',
                expires_at: expiresAt,
                operation_counts: validated.counts,
                issues: validated.issues,
                normalized_payload: validated.payload,
                before_snapshot: validated.beforeSnapshot,
                after_snapshot: validated.afterSnapshot,
            })
            .select('id, expires_at')
            .single();

        if (error || !run) {
            console.error('[kitchen-import-preview] failed to persist preview', error);
            return NextResponse.json({ error: 'Failed to save import preview.' }, { status: 500 });
        }

        const preview: KitchenImportPreview = {
            previewId: run.id,
            digest: validated.sourceDigest,
            expiresAt: run.expires_at,
            restaurantId,
            payload: validated.payload,
            operations: validated.operations,
            issues: validated.issues,
            counts: validated.counts,
            canApply: validated.counts.errors === 0 && validated.operations.length > 0,
        };
        return NextResponse.json(preview);
    } catch (error) {
        console.error('[kitchen-import-preview]', error);
        const message = error instanceof Error ? error.message : 'Failed to preview import.';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

async function extractUploadFiles(uploads: File[]) {
    const output: Partial<Record<KitchenImportFileName | 'manifest.json', string>> = {};
    let totalBytes = 0;

    for (const upload of uploads) {
        totalBytes += upload.size;
        if (totalBytes > MAX_UPLOAD_BYTES) {
            throw new Error('Upload exceeds the 2 MB limit.');
        }

        if (upload.name.toLowerCase().endsWith('.zip')) {
            if (uploads.length !== 1) {
                throw new Error('Upload either one ZIP or individual CSV files, not both.');
            }
            const zip = new AdmZip(Buffer.from(await upload.arrayBuffer()));
            const entries = zip.getEntries();
            for (const entry of entries) {
                if (entry.isDirectory) continue;
                if (entry.entryName.includes('/') || entry.entryName.includes('\\')) {
                    throw new Error('ZIP files may not contain nested paths.');
                }
                if (!ALLOWED_FILE_NAMES.has(entry.entryName)) {
                    throw new Error(`Unexpected file in ZIP: ${entry.entryName}`);
                }
                if (entry.header.size > MAX_UPLOAD_BYTES) {
                    throw new Error(`${entry.entryName} exceeds the size limit.`);
                }
                totalBytes += entry.header.size;
                if (totalBytes > MAX_UPLOAD_BYTES) {
                    throw new Error('Uncompressed ZIP exceeds the 2 MB limit.');
                }
                if (entry.entryName === 'README.md') continue;
                if (output[entry.entryName as KitchenImportFileName | 'manifest.json'] !== undefined) {
                    throw new Error(`Duplicate file: ${entry.entryName}`);
                }
                output[entry.entryName as KitchenImportFileName | 'manifest.json'] =
                    entry.getData().toString('utf8');
            }
            continue;
        }

        if (!ALLOWED_FILE_NAMES.has(upload.name) || upload.name === 'README.md') {
            throw new Error(`Unexpected file: ${upload.name}`);
        }
        const name = upload.name as KitchenImportFileName | 'manifest.json';
        if (output[name] !== undefined) {
            throw new Error(`Duplicate file: ${name}`);
        }
        output[name] = await upload.text();
    }

    return output;
}
