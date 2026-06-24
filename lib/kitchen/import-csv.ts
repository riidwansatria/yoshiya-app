import Papa from 'papaparse';

import type { KitchenImportIssue } from '@/lib/kitchen/import-types';

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '\n', '＝', '＋', '－', '＠'];

export function normalizeImportKey(value: string) {
    return value.normalize('NFKC').replace(/[\s\u3000]+/g, ' ').trim().toLocaleLowerCase();
}

export function protectSpreadsheetText(value: string | null | undefined) {
    const text = value ?? '';
    return FORMULA_PREFIXES.some((prefix) => text.startsWith(prefix)) ? `'${text}` : text;
}

export function decodeSpreadsheetText(value: string) {
    if (value.startsWith("'") && FORMULA_PREFIXES.some((prefix) => value.slice(1).startsWith(prefix))) {
        return value.slice(1);
    }
    return value;
}

export function hasUnsafeFormulaPrefix(value: string) {
    return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function stringifyCsv(headers: string[], rows: Array<Record<string, unknown>>) {
    const csv = Papa.unparse({
        fields: headers,
        data: rows.map((row) =>
            headers.map((header) => {
                const value = row[header];
                return typeof value === 'string' ? protectSpreadsheetText(value) : value ?? '';
            })
        ),
    }, {
        newline: '\r\n',
        quotes: true,
        header: true,
    });
    return `\uFEFF${csv}`;
}

export function parseCsvRecords({
    fileName,
    csvText,
    expectedHeaders,
    maxRows = 2000,
}: {
    fileName: string;
    csvText: string;
    expectedHeaders: string[];
    maxRows?: number;
}) {
    const issues: KitchenImportIssue[] = [];
    const result = Papa.parse<Record<string, string>>(csvText.replace(/^\uFEFF/, ''), {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (header) => header.trim(),
    });

    for (const error of result.errors) {
        issues.push({
            severity: 'error',
            code: 'csv-parse-error',
            file: fileName,
            row: error.row === undefined ? undefined : error.row + 2,
            message: error.message,
        });
    }

    const headers = result.meta.fields ?? [];
    const missingHeaders = expectedHeaders.filter((header) => !headers.includes(header));
    const extraHeaders = headers.filter((header) => !expectedHeaders.includes(header));

    if (missingHeaders.length > 0) {
        issues.push({
            severity: 'error',
            code: 'missing-headers',
            file: fileName,
            message: `Missing required headers: ${missingHeaders.join(', ')}`,
        });
    }
    if (extraHeaders.length > 0) {
        issues.push({
            severity: 'error',
            code: 'unexpected-headers',
            file: fileName,
            message: `Unexpected headers: ${extraHeaders.join(', ')}`,
        });
    }
    if (result.data.length > maxRows) {
        issues.push({
            severity: 'error',
            code: 'too-many-rows',
            file: fileName,
            message: `${fileName} exceeds the ${maxRows.toLocaleString()} row limit.`,
        });
    }

    const records = result.data.slice(0, maxRows).map((record) =>
        Object.fromEntries(
            expectedHeaders.map((header) => [
                header,
                String(record[header] ?? '').trim(),
            ])
        )
    );

    return { records, issues };
}
