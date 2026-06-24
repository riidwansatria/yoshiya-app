import assert from 'node:assert/strict';
import test from 'node:test';

import {
    compareMatrixCsv,
    // @ts-expect-error TS5097 -- Node strip-types resolves explicit TypeScript imports.
} from './matrix-csv-compare.ts';

test('matrix CSV parser supports quoted commas and CRLF', () => {
    const result = compareMatrixCsv({
        csvText: '"Menu","Sauce, Special"\r\n"宴会","2"\r\n',
        currentRows: ['宴会'],
        currentColumns: ['Sauce, Special'],
        getCurrentValue: () => 1,
    });

    assert.deepEqual(result.issues, []);
    assert.deepEqual(result.changes, [{
        rowName: '宴会',
        columnName: 'Sauce, Special',
        currentValue: 1,
        uploadedValue: 2,
        type: 'changed',
    }]);
});

test('matrix validation rejects non-positive quantities', () => {
    const result = compareMatrixCsv({
        csvText: 'Menu,Sauce\n宴会,0\n',
        currentRows: ['宴会'],
        currentColumns: ['Sauce'],
        getCurrentValue: () => 1,
    });

    assert.equal(result.issues[0]?.severity, 'error');
    assert.equal(result.changes.length, 0);
});

test('omitted rows are warnings in the caller and do not create removals', () => {
    const result = compareMatrixCsv({
        csvText: 'Menu,Sauce\n',
        currentRows: ['宴会'],
        currentColumns: ['Sauce'],
        getCurrentValue: () => 1,
    });

    assert.deepEqual(result.missingRows, ['宴会']);
    assert.deepEqual(result.changes, []);
});
