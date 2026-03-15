export type MatrixChangeType = 'added' | 'removed' | 'changed';

export interface MatrixChange {
    rowName: string;
    columnName: string;
    currentValue: number | null;
    uploadedValue: number | null;
    type: MatrixChangeType;
}

export interface MatrixCompareIssue {
    kind: 'missing-header' | 'duplicate-column' | 'duplicate-row' | 'invalid-number';
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

function parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            cells.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    cells.push(current);
    return cells;
}

function parseCsvRows(csvText: string): string[][] {
    return csvText
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .map((line) => parseCsvLine(line));
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
    const parsedRows = parseCsvRows(csvText).filter((row) => row.some((cell) => cell.trim() !== ''));

    if (parsedRows.length === 0) {
        return {
            changes: [],
            unknownRows: [],
            unknownColumns: [],
            missingRows: currentRows,
            missingColumns: currentColumns,
            issues: [{ kind: 'missing-header', message: 'CSV is empty.' }],
        };
    }

    const issues: MatrixCompareIssue[] = [];
    const header = parsedRows[0];

    if (header.length === 0) {
        return {
            changes: [],
            unknownRows: [],
            unknownColumns: [],
            missingRows: currentRows,
            missingColumns: currentColumns,
            issues: [{ kind: 'missing-header', message: 'Header row is missing.' }],
        };
    }

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
                    message: `Invalid number at row "${csvRowName}", column "${columnName}": "${cell}".`,
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
