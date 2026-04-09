import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
    return (
        <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
            <h1 className="text-2xl font-semibold">Page not found</h1>
            <p className="text-sm text-muted-foreground">The page you requested does not exist.</p>
            <Link
                href="/dashboard/banquet/schedule"
                className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
                Back to dashboard
            </Link>
        </main>
    );
}
