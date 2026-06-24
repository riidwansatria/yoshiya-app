import assert from 'node:assert/strict';
import test from 'node:test';

import {
    decodeSpreadsheetText,
    hasUnsafeFormulaPrefix,
    parseCsvRecords,
    protectSpreadsheetText,
    stringifyCsv,
    // @ts-expect-error TS5097 -- Node strip-types resolves explicit TypeScript imports.
} from './import-csv.ts';

test('CSV utilities round-trip Japanese commas, quotes, and multiline text', () => {
    const csv = stringifyCsv(
        ['name', 'description'],
        [{ name: 'たれ, 特製', description: '一行目\n"二行目"' }]
    );
    const parsed = parseCsvRecords({
        fileName: 'test.csv',
        csvText: csv,
        expectedHeaders: ['name', 'description'],
    });

    assert.deepEqual(parsed.issues, []);
    assert.deepEqual(parsed.records, [
        { name: 'たれ, 特製', description: '一行目\n"二行目"' },
    ]);
});

test('spreadsheet formula protection is reversible', () => {
    assert.equal(protectSpreadsheetText('=SUM(A1:A2)'), "'=SUM(A1:A2)");
    assert.equal(decodeSpreadsheetText("'=SUM(A1:A2)"), '=SUM(A1:A2)');
    assert.equal(hasUnsafeFormulaPrefix('＝1+1'), true);
    assert.equal(hasUnsafeFormulaPrefix('普通の名前'), false);
});
