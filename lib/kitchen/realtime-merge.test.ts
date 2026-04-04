import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error TS5097 -- Node strip-types test runner resolves explicit .ts imports.
import {
    areIngredientDraftRowsEqual,
    mergeComponentIngredientRows,
    mergeUntouchedFields,
} from './realtime-merge.ts';

test('mergeUntouchedFields applies untouched scalar fields and preserves dirty fields', () => {
    const result = mergeUntouchedFields({
        fields: ['name', 'unit', 'category'] as const,
        currentValues: {
            name: 'Tomato',
            unit: 'g',
            category: 'Fresh',
        },
        remoteValues: {
            name: 'Cherry Tomato',
            unit: 'g',
            category: 'Produce',
        },
        dirtyFields: {
            name: true,
            unit: false,
            category: false,
        },
    });

    assert.deepEqual(result.applied_fields, ['category']);
    assert.deepEqual(result.conflicting_fields, ['name']);
    assert.deepEqual(result.nextValues, {
        category: 'Produce',
    });
});

test('mergeComponentIngredientRows replaces pristine arrays with remote rows', () => {
    const syncedRows = [
        { ingredient_id: 'a', qty_per_serving: '1' },
        { ingredient_id: 'b', qty_per_serving: '2' },
    ];

    const result = mergeComponentIngredientRows({
        currentRows: syncedRows,
        syncedRows,
        remoteRows: [
            { ingredient_id: 'a', qty_per_serving: '1 1/2' },
            { ingredient_id: 'b', qty_per_serving: '2' },
        ],
    });

    assert.equal(result.remote_changed, true);
    assert.deepEqual(result.applied_fields, ['ingredients']);
    assert.deepEqual(result.conflicting_fields, []);
    assert.deepEqual(result.nextRows, [
        { ingredient_id: 'a', qty_per_serving: '1 1/2' },
        { ingredient_id: 'b', qty_per_serving: '2' },
    ]);
});

test('mergeComponentIngredientRows reports conflicts for local qty edits', () => {
    const result = mergeComponentIngredientRows({
        currentRows: [{ ingredient_id: 'a', qty_per_serving: '3' }],
        syncedRows: [{ ingredient_id: 'a', qty_per_serving: '1' }],
        remoteRows: [{ ingredient_id: 'a', qty_per_serving: '2' }],
    });

    assert.equal(result.remote_changed, true);
    assert.deepEqual(result.applied_fields, []);
    assert.deepEqual(result.conflicting_fields, ['ingredients']);
    assert.equal(result.nextRows, null);
});

test('mergeComponentIngredientRows reports conflicts for add remove and reorder changes', () => {
    const syncedRows = [
        { ingredient_id: 'a', qty_per_serving: '1' },
        { ingredient_id: 'b', qty_per_serving: '2' },
    ];

    const addConflict = mergeComponentIngredientRows({
        currentRows: [...syncedRows, { ingredient_id: 'c', qty_per_serving: '1' }],
        syncedRows,
        remoteRows: [...syncedRows, { ingredient_id: 'd', qty_per_serving: '3' }],
    });
    assert.deepEqual(addConflict.conflicting_fields, ['ingredients']);

    const removeConflict = mergeComponentIngredientRows({
        currentRows: [{ ingredient_id: 'a', qty_per_serving: '1' }],
        syncedRows,
        remoteRows: [{ ingredient_id: 'a', qty_per_serving: '1' }, { ingredient_id: 'b', qty_per_serving: '3' }],
    });
    assert.deepEqual(removeConflict.conflicting_fields, ['ingredients']);

    const reorderConflict = mergeComponentIngredientRows({
        currentRows: [syncedRows[1], syncedRows[0]],
        syncedRows,
        remoteRows: [{ ingredient_id: 'a', qty_per_serving: '1' }],
    });
    assert.deepEqual(reorderConflict.conflicting_fields, ['ingredients']);
});

test('areIngredientDraftRowsEqual compares row order and values', () => {
    assert.equal(
        areIngredientDraftRowsEqual(
            [{ ingredient_id: 'a', qty_per_serving: '1' }],
            [{ ingredient_id: 'a', qty_per_serving: '1' }]
        ),
        true
    );

    assert.equal(
        areIngredientDraftRowsEqual(
            [{ ingredient_id: 'a', qty_per_serving: '1' }],
            [{ ingredient_id: 'a', qty_per_serving: '2' }]
        ),
        false
    );
});
