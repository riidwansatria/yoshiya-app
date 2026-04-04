'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RealtimeSyncBannerProps {
    title: string;
    description: string;
    conflictFields?: string[];
    reviewLabel: string;
    reloadLabel: string;
    reviewOpen?: boolean;
    deleted?: boolean;
    onReview?: () => void;
    onReload?: () => void;
    children?: ReactNode;
}

export function RealtimeSyncBanner({
    title,
    description,
    conflictFields = [],
    reviewLabel,
    reloadLabel,
    reviewOpen = false,
    deleted = false,
    onReview,
    onReload,
    children,
}: RealtimeSyncBannerProps) {
    return (
        <div
            className={cn(
                'rounded-md border p-4',
                deleted
                    ? 'border-red-200 bg-red-50 text-red-950'
                    : 'border-amber-200 bg-amber-50 text-amber-950'
            )}
        >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                    <p className="font-medium">{title}</p>
                    <p className="text-sm">{description}</p>
                    {conflictFields.length > 0 ? (
                        <p className="text-xs uppercase tracking-wide opacity-80">
                            {conflictFields.join(', ')}
                        </p>
                    ) : null}
                </div>
                {!deleted && (onReview || onReload) ? (
                    <div className="flex gap-2">
                        {onReview ? (
                            <Button type="button" variant={reviewOpen ? 'secondary' : 'outline'} size="sm" onClick={onReview}>
                                {reviewLabel}
                            </Button>
                        ) : null}
                        {onReload ? (
                            <Button type="button" size="sm" onClick={onReload}>
                                {reloadLabel}
                            </Button>
                        ) : null}
                    </div>
                ) : null}
            </div>
            {children ? <div className="mt-4 border-t border-current/10 pt-4">{children}</div> : null}
        </div>
    );
}
