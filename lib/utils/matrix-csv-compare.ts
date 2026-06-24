import Papa from 'papaparse';

export type MatrixChangeType = 'added' | 'removed' | 'changed';

export interface MatrixChange {
    rowName: string;
    columnName: string;
    currentValue: number | null;
    uploadedValue: number | null;
    type: MatrixChangeType;
}

export interface MatrixCompareIssue {
    kind: 'missing-header' | 'duplicate-column' | 'duplicate-row' | 'invalid-number' | 'csv-parse';
    severity: 'error' | 'warning';
    message: string;
}

export interface MatrixCompareResult {
    changes: MatrixChange[];
    unknownRows: string[];
    unknownColumns: string[];
    missingRows: string[];
    missingColumns: string[];
    issues: MatrixCompareIssue[];
}

interface CompareMatrixCsvInput {
    csvText: string;
    currentRows: string[];
    currentColumns: string[];
    getCurrentValue: (rowName: string, columnName: string) => number | undefined;
}

function parseCsvRows(csvText: string) {
    return Papa.parse<string[]>(csvText.replace(/^\uFEFF/, ''), {
        skipEmptyLines: 'greedy',
    });
}

function normalizeCell(value: string | undefined): string {
    return (value ?? '').trim();
}

function normalizeMatchKey(value: string): string {
    return value
        .normalize('NFKC')
        .replace(/[\s\u3000]+/g, ' ')
        .trim();
}

function toNumberOrNull(value: string): number | null {
    if (!value) {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function compareMatrixCsv({
    csvText,
    currentRows,
    currentColumns,
    getCurrentValue,
}: CompareMatrixCsvInput): MatrixCompareResult {
    const parsed = parseCsvRows(csvText);
    const parsedRows = parsed.data.filter((row) => row.some((cell) => cell.trim() !== ''));
    const parseIssues: MatrixCompareIssue[] = parsed.errors.map((error) => ({
        kind: 'csv-parse',
        severity: 'error',
        message: error.message,
    }));

    if (parsedRows.length === 0) {
        return {
            changes: [],
            unknownRows: [],
            unknownColumns: [],
            missingRows: currentRows,
            missingColumns: currentColumns,
            issues: [...parseIssues, { kind: 'missing-header', severity: 'error', message: 'CSV is empty.' }],
        };
    }

    const issues: MatrixCompareIssue[] = [...parseIssues];
    const header = parsedRows[0];

    if (header.length === 0) {
        return {
            changes: [],
            unknownRows: [],
            unknownColumns: [],
            missingRows: currentRows,
            missingColumns: currentColumns,
            issues: [...parseIssues, { kind: 'missing-header', severity: 'error', message: 'Header row is missing.' }],
        };
    }

    parsedRows.slice(1).forEach((row, index) => {
        if (row.length !== header.length) {
            issues.push({
                kind: 'csv-parse',
                severity: 'error',
                message: `Row ${index + 2} has ${row.length} cells; expected ${header.length}.`,
            });
        }
    });

    const csvColumns = header.slice(1).map(normalizeCell);

    const currentRowsByKey = new Map<string, string>();
    for (const rowName of currentRows) {
        const key = normalizeMatchKey(rowName);
        if (!key) {
            continue;
        }

        if (currentRowsByKey.has(key)) {
            issues.push({
                kind: 'duplicate-row',
                severity: 'error',
                message: `App has multiple component/menu rows that normalize to the same name: "${currentRowsByKey.get(key)}" and "${rowName}".`,
            });
            continue;
        }

        currentRowsByKey.set(key, rowName);
    }

    const currentColumnsByKey = new Map<string, string>();
    for (const columnName of currentColumns) {
        const key = normalizeMatchKey(columnName);
        if (!key) {
            continue;
        }

        if (currentColumnsByKey.has(key)) {
            issues.push({
                kind: 'duplicate-column',
                severity: 'error',
                message: `App has multiple columns that normalize to the same name: "${currentColumnsByKey.get(key)}" and "${columnName}".`,
            });
            continue;
        }

        currentColumnsByKey.set(key, columnName);
    }

    const csvColumnSet = new Set<string>();
    for (const col of csvColumns) {
        const key = normalizeMatchKey(col);
        if (!key) {
            continue;
        }
        if (csvColumnSet.has(key)) {
            issues.push({
                kind: 'duplicate-column',
                severity: 'error',
                message: `Duplicate column in CSV header after normalization: "${col}".`,
            });
        }
        csvColumnSet.add(key);
    }

    const unknownColumns = csvColumns
        .filter((col) => !!normalizeMatchKey(col))
        .filter((col) => !currentColumnsByKey.has(normalizeMatchKey(col)));

    const missingColumns = currentColumns.filter((col) => !csvColumnSet.has(normalizeMatchKey(col)));

    const csvRowSet = new Set<string>();
    const unknownRows: string[] = [];
    const comparedRows: Array<{ csvRowName: string; appRowName: string; cells: string[] }> = [];

    for (const row of parsedRows.slice(1)) {
        const rowName = normalizeCell(row[0]);
        const rowKey = normalizeMatchKey(rowName);

        if (!rowKey) {
            continue;
        }

        if (csvRowSet.has(rowKey)) {
            issues.push({
                kind: 'duplicate-row',
                severity: 'error',
                message: `Duplicate row in CSV body after normalization: "${rowName}".`,
            });
            continue;
        }

        csvRowSet.add(rowKey);

        const appRowName = currentRowsByKey.get(rowKey);

        if (!appRowName) {
            unknownRows.push(rowName);
            continue;
        }

        comparedRows.push({ csvRowName: rowName, appRowName, cells: row.slice(1) });
    }

    const missingRows = currentRows.filter((rowName) => !csvRowSet.has(normalizeMatchKey(rowName)));
    const changes: MatrixChange[] = [];

    for (const { csvRowName, appRowName, cells } of comparedRows) {
        for (let colIndex = 0; colIndex < csvColumns.length; colIndex += 1) {
            const columnName = csvColumns[colIndex];
            const columnKey = normalizeMatchKey(columnName);
            if (!columnKey) {
                continue;
            }

            const appColumnName = currentColumnsByKey.get(columnKey);
            if (!appColumnName) {
                continue;
            }

            const cell = normalizeCell(cells[colIndex]);
            const uploaded = toNumberOrNull(cell);

            if (cell && uploaded === null) {
                issues.push({
                    kind: 'invalid-number',
                    severity: 'error',
                    message: `Invalid number at row "${csvRowName}", column "${columnName}": "${cell}".`,
                });
                continue;
            }
            if (uploaded !== null && uploaded <= 0) {
                issues.push({
                    kind: 'invalid-number',
                    severity: 'error',
                    message: `Quantity must be greater than zero at row "${csvRowName}", column "${columnName}".`,
                });
                continue;
            }

            const current = getCurrentValue(appRowName, appColumnName);
            const currentValue = current === undefined ? null : current;
            const uploadedValue = uploaded;

            if (currentValue === null && uploadedValue === null) {
                continue;
            }

            if (currentValue === null && uploadedValue !== null) {
                changes.push({
                    rowName: appRowName,
                    columnName: appColumnName,
                    currentValue,
                    uploadedValue,
                    type: 'added',
                });
                continue;
            }

            if (currentValue !== null && uploadedValue === null) {
                changes.push({
                    rowName: appRowName,
                    columnName: appColumnName,
                    currentValue,
                    uploadedValue,
                    type: 'removed',
                });
                continue;
            }

            if ((currentValue ?? 0) !== (uploadedValue ?? 0)) {
                changes.push({
                    rowName: appRowName,
                    columnName: appColumnName,
                    currentValue,
                    uploadedValue,
                    type: 'changed',
                });
            }
        }
    }

    return {
        changes,
        unknownRows,
        unknownColumns,
        missingRows,
        missingColumns,
        issues,
    };
}
