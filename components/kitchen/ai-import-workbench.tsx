'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Database,
    Download,
    FileArchive,
    FileSpreadsheet,
    Loader2,
    ShieldCheck,
    UploadCloud,
    XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type {
    KitchenImportApplyResult,
    KitchenImportOperation,
    KitchenImportPreview,
} from '@/lib/kitchen/import-types';
import {
    buildDashboardComponentsMatrixPath,
    buildDashboardComponentsPath,
    buildDashboardMenusMatrixPath,
    buildDashboardMenusPath,
} from '@/lib/constants/routes';

type Overview = {
    restaurant: { id: string; name: string };
    counts: {
        ingredients: number;
        components: number;
        menus: number;
        componentIngredients: number;
        menuComponents: number;
    };
};

export function AiImportWorkbench({
    overview,
    applyEnabled,
}: {
    overview: Overview;
    applyEnabled: boolean;
}) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [preview, setPreview] = useState<KitchenImportPreview | null>(null);
    const [result, setResult] = useState<KitchenImportApplyResult | null>(null);
    const [acknowledged, setAcknowledged] = useState(false);
    const [isPreviewPending, startPreviewTransition] = useTransition();
    const [isApplyPending, startApplyTransition] = useTransition();

    const groupedOperations = useMemo(() => {
        const groups = new Map<KitchenImportOperation['entity'], KitchenImportOperation[]>();
        for (const operation of preview?.operations ?? []) {
            groups.set(operation.entity, [...(groups.get(operation.entity) ?? []), operation]);
        }
        return groups;
    }, [preview]);

    const selectFiles = (files: FileList | null) => {
        const next = files ? Array.from(files) : [];
        setSelectedFiles(next);
        setPreview(null);
        setResult(null);
        setAcknowledged(false);
    };

    const previewUpload = () => {
        if (selectedFiles.length === 0) return;
        startPreviewTransition(async () => {
            const formData = new FormData();
            formData.set('restaurantId', overview.restaurant.id);
            selectedFiles.forEach((file) => formData.append('files', file));
            const response = await fetch('/api/kitchen/import/preview', {
                method: 'POST',
                body: formData,
            });
            const body = await response.json();
            if (!response.ok) {
                toast.error(body.error ?? 'Failed to preview import.');
                return;
            }
            setPreview(body as KitchenImportPreview);
            toast.success('Import preview is ready.');
        });
    };

    const applyImport = () => {
        if (!preview?.canApply || !acknowledged || !preview.previewId || !preview.digest) return;
        startApplyTransition(async () => {
            const response = await fetch('/api/kitchen/import/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId: preview.restaurantId,
                    previewId: preview.previewId,
                    digest: preview.digest,
                    payload: preview.payload,
                }),
            });
            const body = await response.json();
            if (!response.ok) {
                toast.error(body.error ?? 'Failed to apply import.');
                return;
            }
            setResult(body as KitchenImportApplyResult);
            toast.success('Kitchen import applied.');
            router.refresh();
        });
    };

    const downloadResult = () => {
        if (!result) return;
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `kitchen-import-${result.run_id}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mx-auto max-w-7xl space-y-5">
            <Card>
                <CardHeader>
                    <CardTitle>Kitchen data pack</CardTitle>
                    <CardDescription>
                        Download the current data or select edited CSV files for validation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div className="flex flex-wrap gap-2">
                            <Button asChild>
                                <a href={`/api/kitchen/import/export?restaurant=${encodeURIComponent(overview.restaurant.id)}`}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download data pack
                                </a>
                            </Button>
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Select files
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".zip,.csv,application/zip,text/csv"
                                className="hidden"
                                onChange={(event) => selectFiles(event.target.files)}
                            />
                        </div>
                        <div className="min-w-72 rounded-lg border bg-muted/20 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Database className="h-4 w-4 text-muted-foreground" />
                                {overview.restaurant.name}
                            </div>
                            <div className="mt-3 grid grid-cols-4 gap-4">
                                <Count label="Ingredients" value={overview.counts.ingredients} />
                                <Count label="Components" value={overview.counts.components} />
                                <Count label="Menus" value={overview.counts.menus} />
                                <Count
                                    label="Links"
                                    value={overview.counts.componentIngredients + overview.counts.menuComponents}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Matrix files
                    </CardTitle>
                    <CardDescription>
                        Export or update component and menu relationships.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                    <Button variant="outline" className="h-auto justify-start px-4 py-3" asChild>
                        <Link href={buildDashboardComponentsMatrixPath(overview.restaurant.id)}>
                            <FileSpreadsheet className="mr-3 h-5 w-5 text-emerald-700" />
                            <span className="text-left">
                                <span className="block font-medium">Component–ingredient matrix</span>
                                <span className="block text-xs font-normal text-muted-foreground">
                                    Edit recipe ingredient quantities
                                </span>
                            </span>
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-auto justify-start px-4 py-3" asChild>
                        <Link href={buildDashboardMenusMatrixPath(overview.restaurant.id)}>
                            <FileSpreadsheet className="mr-3 h-5 w-5 text-emerald-700" />
                            <span className="text-left">
                                <span className="block font-medium">Menu–component matrix</span>
                                <span className="block text-xs font-normal text-muted-foreground">
                                    Edit menu component quantities
                                </span>
                            </span>
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileArchive className="h-5 w-5" />
                            Upload files
                        </CardTitle>
                        <CardDescription>
                            Upload one ZIP, or any subset of the five supported CSV files.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex min-h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-4 text-center transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <UploadCloud className="mb-3 h-8 w-8 text-emerald-700" />
                            <span className="font-medium">Select ZIP or CSV files</span>
                            <span className="mt-1 text-xs text-muted-foreground">
                                ZIP or CSV · 2 MB maximum · no nested folders
                            </span>
                        </button>

                        {selectedFiles.length > 0 ? (
                            <div className="space-y-2">
                                {selectedFiles.map((file) => (
                                    <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <span className="truncate">{file.name}</span>
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <Button
                            className="w-full"
                            onClick={previewUpload}
                            disabled={selectedFiles.length === 0 || isPreviewPending}
                        >
                            {isPreviewPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ArrowRight className="mr-2 h-4 w-4" />
                            )}
                            Validate and preview
                        </Button>

                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground">
                            <strong className="text-foreground">Important:</strong> missing rows never
                            delete master records. Relationship deletion requires an explicit{' '}
                            <code>remove</code> action.
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Change review</CardTitle>
                        <CardDescription>
                            Creates, updates, relationship changes, warnings, and blocking errors.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!preview ? (
                            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed text-center">
                                <ShieldCheck className="mb-3 h-9 w-9 text-muted-foreground/60" />
                                <p className="font-medium">No preview yet</p>
                                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                    Upload edited files to create a server-validated, 30-minute preview.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                                    <Metric label="Create" value={preview.counts.creates} />
                                    <Metric label="Update" value={preview.counts.updates} />
                                    <Metric label="Set" value={preview.counts.relationshipSets} />
                                    <Metric label="Remove" value={preview.counts.relationshipRemovals} />
                                    <Metric label="Warnings" value={preview.counts.warnings} tone="warning" />
                                    <Metric label="Errors" value={preview.counts.errors} tone="danger" />
                                </div>

                                {preview.issues.length > 0 ? (
                                    <div className="max-h-48 space-y-2 overflow-auto rounded-lg border p-3">
                                        {preview.issues.map((issue, index) => (
                                            <div key={`${issue.code}-${issue.file}-${issue.row}-${index}`} className="flex gap-2 text-sm">
                                                {issue.severity === 'error' ? (
                                                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                                ) : (
                                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                                )}
                                                <div>
                                                    <p>{issue.message}</p>
                                                    {issue.file ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            {issue.file}
                                                            {issue.row ? ` · row ${issue.row}` : ''}
                                                            {issue.field ? ` · ${issue.field}` : ''}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                <div className="max-h-[28rem] space-y-4 overflow-auto pr-1">
                                    {Array.from(groupedOperations.entries()).map(([entity, rows]) => (
                                        <section key={entity} className="rounded-lg border">
                                            <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                                                <h3 className="text-sm font-medium">{entityLabel(entity)}</h3>
                                                <Badge variant="outline">{rows.length}</Badge>
                                            </div>
                                            <div className="divide-y">
                                                {rows.map((operation) => (
                                                    <OperationRow
                                                        key={`${operation.file}-${operation.row}-${operation.ref}-${operation.relatedRef ?? ''}`}
                                                        operation={operation}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    ))}
                                </div>

                                {result ? (
                                    <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-4">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium">Import applied successfully</p>
                                                <p className="mt-1 break-all text-xs text-muted-foreground">
                                                    Run {result.run_id}
                                                </p>
                                                <Button variant="outline" size="sm" className="mt-3" onClick={downloadResult}>
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Download result report
                                                </Button>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={buildDashboardComponentsPath(overview.restaurant.id)}>
                                                            View components
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={buildDashboardMenusPath(overview.restaurant.id)}>
                                                            View menus
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 rounded-xl border p-4">
                                        <label className="flex cursor-pointer items-start gap-3 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={acknowledged}
                                                onChange={(event) => setAcknowledged(event.target.checked)}
                                                className="mt-0.5 h-4 w-4 rounded border-input accent-emerald-700"
                                            />
                                            <span>
                                                I reviewed the affected restaurant and all proposed creates,
                                                updates, and relationship removals.
                                            </span>
                                        </label>
                                        {!applyEnabled ? (
                                            <p className="text-xs text-amber-700">
                                                Apply is disabled by the rollout flag. Preview remains available.
                                            </p>
                                        ) : null}
                                        <Button
                                            className="w-full"
                                            onClick={applyImport}
                                            disabled={
                                                !applyEnabled ||
                                                !preview.canApply ||
                                                !acknowledged ||
                                                isApplyPending
                                            }
                                        >
                                            {isApplyPending ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                            )}
                                            Apply all changes atomically
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function Count({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</p>
        </div>
    );
}

function Metric({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: number;
    tone?: 'default' | 'warning' | 'danger';
}) {
    return (
        <div
            className={
                tone === 'danger'
                    ? 'rounded-lg border border-destructive/30 bg-destructive/5 p-2'
                    : tone === 'warning'
                        ? 'rounded-lg border border-amber-500/30 bg-amber-500/5 p-2'
                        : 'rounded-lg border p-2'
            }
        >
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
    );
}

function OperationRow({ operation }: { operation: KitchenImportOperation }) {
    return (
        <div className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <Badge variant={operation.action === 'remove' ? 'destructive' : 'secondary'}>
                {operation.action}
            </Badge>
            <div className="min-w-0">
                <p className="truncate font-medium">
                    {operation.label || operation.ref}
                    {operation.relatedLabel ? ` → ${operation.relatedLabel}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                    {operation.file} · row {operation.row}
                </p>
            </div>
            <div className="text-xs tabular-nums text-muted-foreground">
                {summarizeProposal(operation)}
            </div>
        </div>
    );
}

function entityLabel(entity: KitchenImportOperation['entity']) {
    return {
        ingredient: 'Ingredients',
        component: 'Components',
        menu: 'Menus',
        component_ingredient: 'Component ingredients',
        menu_component: 'Menu components',
    }[entity];
}

function summarizeProposal(operation: KitchenImportOperation) {
    if (operation.action === 'remove') return 'relationship removed';
    if (!operation.proposed) return '';
    if ('batch_quantity' in operation.proposed) {
        return `batch ${String(operation.proposed.batch_quantity)}`;
    }
    if ('quantity_per_menu_order' in operation.proposed) {
        return `${String(operation.proposed.quantity_per_menu_order)} per order`;
    }
    return `${Object.keys(operation.proposed).length} fields`;
}
