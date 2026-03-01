import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error TS5097 -- Node strip-types test runner resolves explicit .ts imports.
import { parseFractionalQuantity } from './fraction-quantity.ts';

test('parses decimal quantity', () => {
    const result = parseFractionalQuantity('0.5');
    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.value, 0.5);
    }
});

test('parses fraction quantity and rounds to 6 decimals', () => {
    const result = parseFractionalQuantity('1/6');
    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.value, 0.166667);
    }
});

test('parses mixed quantity', () => {
    const result = parseFractionalQuantity('1 1/2');
    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.value, 1.5);
    }
});

test('tolerates whitespace around fraction slash', () => {
    const result = parseFractionalQuantity(' 1 / 4 ');
    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.value, 0.25);
    }
});

test('rejects zero denominator', () => {
    const result = parseFractionalQuantity('1/0');
    assert.equal(result.ok, false);
    if (!result.ok) {
        assert.equal(result.error, 'Denominator must be greater than 0.');
    }
});

test('rejects malformed input', () => {
    const first = parseFractionalQuantity('1//2');
    assert.equal(first.ok, false);
    const second = parseFractionalQuantity('abc');
    assert.equal(second.ok, false);
});

test('rejects non-positive values', () => {
    const zero = parseFractionalQuantity('0');
    assert.equal(zero.ok, false);

    const negativeFraction = parseFractionalQuantity('-1/2');
    assert.equal(negativeFraction.ok, false);
});
