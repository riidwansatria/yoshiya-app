import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getLocalizedTagLabel,
    menuMatchesTagFilters,
    normalizeMenuTagLabel,
    normalizeMenuTagLookupLabel,
    partitionTagsByKind,
    // @ts-expect-error TS5097 -- Node strip-types test runner resolves explicit .ts imports.
} from './menu-tags.ts';

const makeTag = (overrides: Partial<{
    id: string; label: string; label_en: string | null;
    kind: 'dietary' | 'ingredient'; created_at: string | null; updated_at: string | null;
}> = {}) => ({
    id: 'tag-1',
    label: 'ヴィーガン',
    label_en: null,
    kind: 'dietary' as const,
    created_at: null,
    updated_at: null,
    ...overrides,
});

test('getLocalizedTagLabel returns label_en when locale is en and label_en exists', () => {
    const tag = makeTag({ label_en: 'Vegan' });
    assert.equal(getLocalizedTagLabel(tag, 'en'), 'Vegan');
});

test('getLocalizedTagLabel falls back to label when locale is en but label_en is null', () => {
    const tag = makeTag({ label_en: null });
    assert.equal(getLocalizedTagLabel(tag, 'en'), 'ヴィーガン');
});

test('getLocalizedTagLabel returns label for non-en locale regardless of label_en', () => {
    const tag = makeTag({ label_en: 'Vegan' });
    assert.equal(getLocalizedTagLabel(tag, 'ja'), 'ヴィーガン');
});

test('partitionTagsByKind splits into dietary and ingredient buckets', () => {
    const dietary = makeTag({ id: 'd1', kind: 'dietary' });
    const ingredient = makeTag({ id: 'i1', kind: 'ingredient' });
    const { dietary: d, ingredient: i } = partitionTagsByKind([dietary, ingredient]);
    assert.deepEqual(d, [dietary]);
    assert.deepEqual(i, [ingredient]);
});

test('partitionTagsByKind handles empty array', () => {
    const { dietary, ingredient } = partitionTagsByKind([]);
    assert.deepEqual(dietary, []);
    assert.deepEqual(ingredient, []);
});

test('normalizeMenuTagLabel trims surrounding whitespace', () => {
    assert.equal(normalizeMenuTagLabel('  Vegan  '), 'Vegan');
});

test('normalizeMenuTagLookupLabel trims and lowercases labels', () => {
    assert.equal(normalizeMenuTagLookupLabel('  HaLaL  '), 'halal');
});

test('menuMatchesTagFilters returns true when there are no filters', () => {
    assert.equal(menuMatchesTagFilters(['a'], []), true);
});

test('menuMatchesTagFilters requires menus to match all included tags', () => {
    assert.equal(
        menuMatchesTagFilters(['vegan'], [
            { tagId: 'vegan', mode: 'include' },
            { tagId: 'halal', mode: 'include' },
        ]),
        false
    );

    assert.equal(
        menuMatchesTagFilters(['vegan', 'halal'], [
            { tagId: 'vegan', mode: 'include' },
            { tagId: 'halal', mode: 'include' },
        ]),
        true
    );

    assert.equal(
        menuMatchesTagFilters(['seasonal'], [
            { tagId: 'vegan', mode: 'include' },
            { tagId: 'halal', mode: 'include' },
        ]),
        false
    );
});

test('menuMatchesTagFilters supports exclude-any matching when include is empty', () => {
    assert.equal(
        menuMatchesTagFilters(['vegan'], [{ tagId: 'vegan', mode: 'exclude' }]),
        false
    );

    assert.equal(
        menuMatchesTagFilters(['seasonal'], [{ tagId: 'vegan', mode: 'exclude' }]),
        true
    );
});

test('menuMatchesTagFilters combines include-all with exclude-none', () => {
    assert.equal(
        menuMatchesTagFilters(['vegan', 'halal'], [
            { tagId: 'vegan', mode: 'include' },
            { tagId: 'halal', mode: 'exclude' },
        ]),
        false
    );

    assert.equal(
        menuMatchesTagFilters(['vegan', 'seasonal'], [
            { tagId: 'vegan', mode: 'include' },
            { tagId: 'seasonal', mode: 'include' },
            { tagId: 'halal', mode: 'exclude' },
        ]),
        true
    );

    assert.equal(
        menuMatchesTagFilters(['vegan'], [
            { tagId: 'vegan', mode: 'include' },
            { tagId: 'seasonal', mode: 'include' },
            { tagId: 'halal', mode: 'exclude' },
        ]),
        false
    );
});
