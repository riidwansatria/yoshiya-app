import assert from 'node:assert/strict';
import test from 'node:test';

import {
    isAdminRole,
    type UserAccess,
    // @ts-expect-error TS5097 -- Node strip-types resolves explicit TypeScript imports.
} from './access-control.ts';

function access(role: UserAccess['role']): UserAccess {
    return {
        role,
        modules: [],
        permissions: [],
    };
}

test('isAdminRole only permits the exact admin role', () => {
    assert.equal(isAdminRole(access('admin')), true);
    assert.equal(isAdminRole(access('owner')), false);
    assert.equal(isAdminRole(access('manager')), false);
    assert.equal(isAdminRole(access('staff')), false);
    assert.equal(isAdminRole(null), false);
});
