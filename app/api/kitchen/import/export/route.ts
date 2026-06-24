import AdmZip from 'adm-zip';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdminRole, isAuthorizationError } from '@/lib/auth/server';
import { buildKitchenImportPack } from '@/lib/kitchen/import-pack';

export async function GET(request: NextRequest) {
    try {
        await requireAdminRole();
    } catch (error) {
        if (isAuthorizationError(error)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        throw error;
    }

    const restaurantId = request.nextUrl.searchParams.get('restaurant');
    if (!restaurantId) {
        return NextResponse.json({ error: 'Missing restaurant' }, { status: 400 });
    }

    try {
        const pack = await buildKitchenImportPack(restaurantId);
        const zip = new AdmZip();
        for (const [name, contents] of Object.entries(pack.files)) {
            zip.addFile(name, Buffer.from(contents, 'utf8'));
        }
        const date = new Date().toISOString().slice(0, 10);
        const fileName = `yoshiya-kitchen-${restaurantId}-${date}.zip`;

        return new NextResponse(zip.toBuffer(), {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('[kitchen-import-export]', error);
        return NextResponse.json({ error: 'Failed to create data pack' }, { status: 500 });
    }
}
