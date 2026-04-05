import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error TS5097 -- Node strip-types test runner resolves explicit .ts imports.
import {
    menuMatchesTagFilters,
    normalizeMenuTagLabel,
    normalizeMenuTagLookupLabel,
} from './menu-tags.ts';

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
