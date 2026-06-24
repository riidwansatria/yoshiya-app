import assert from 'node:assert/strict';
import test from 'node:test';

import {
    compareMenuNames,
    menuNumberIndex,
    // @ts-expect-error TS5097 -- Node strip-types resolves explicit TypeScript imports.
} from './menu-number.ts';

test('menuNumberIndex reads normalized and legacy menu prefixes', () => {
    assert.equal(menuNumberIndex('21 | Halal menu'), 21);
    assert.equal(menuNumberIndex('21｜Halal menu'), 21);
    assert.equal(menuNumberIndex('２１｜Halal menu'), 21);
    assert.equal(menuNumberIndex('㉑Halal menu'), 21);
    assert.equal(menuNumberIndex('No number'), Number.POSITIVE_INFINITY);
});

test('compareMenuNames sorts numbered menus numerically and ties by title', () => {
    const menus = [
        { name: '10 | Menu' },
        { name: '2 | B menu' },
        { name: 'Unnumbered' },
        { name: '2 | A menu' },
        { name: '㉑Legacy menu' },
    ];

    assert.deepEqual(
        menus.toSorted(compareMenuNames).map((menu) => menu.name),
        ['2 | A menu', '2 | B menu', '10 | Menu', '㉑Legacy menu', 'Unnumbered']
    );
});
