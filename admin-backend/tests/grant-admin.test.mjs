import assert from 'node:assert/strict';
import test from 'node:test';
import { grantAdmin, validateGrantInput } from '../scripts/grant-admin.mjs';

test('normalizes a super admin grant', () => {
  assert.deepEqual(validateGrantInput(' Admin@Example.edu ', 'super_admin', 'ignored'), {
    email: 'admin@example.edu', role: 'super_admin', campusId: '',
  });
});

test('creates a pending invitation when the user does not exist', async () => {
  const requests = [];
  const result = await grantAdmin({ email: 'new@example.edu', role: 'super_admin' }, {
    restSelect: async (table) => ({ data: table === 'users' ? [] : [] }),
    supabaseRequest: async (kind, endpoint, options) => {
      requests.push({ kind, endpoint, options });
      return { data: [{ id: 'invite-1', ...options.body }] };
    },
  });

  assert.equal(result.kind, 'invitation');
  assert.equal(result.created, true);
  assert.deepEqual(requests[0].options.body, {
    email: 'new@example.edu', role: 'super_admin', campus_id: null, status: 'pending',
  });
});

test('assigns and activates an existing pending user', async () => {
  const requests = [];
  const result = await grantAdmin({ email: 'pending@example.edu', role: 'super_admin' }, {
    restSelect: async (table) => {
      if (table === 'users') return { data: [{ id: 'user-1', email: 'pending@example.edu', status: 'pending' }] };
      return { data: [] };
    },
    supabaseRequest: async (kind, endpoint, options) => {
      requests.push({ kind, endpoint, options });
      return endpoint === 'admin_assignments'
        ? { data: [{ id: 'assignment-1', ...options.body }] }
        : { data: [{ id: 'user-1', status: 'active' }] };
    },
  });

  assert.equal(result.kind, 'assignment');
  assert.equal(result.created, true);
  assert.equal(requests[0].endpoint, 'admin_assignments');
  assert.equal(requests[1].endpoint, 'users?id=eq.user-1');
  assert.deepEqual(requests[1].options.body, { status: 'active' });
});

test('reuses an existing pending invitation', async () => {
  let writes = 0;
  const result = await grantAdmin({ email: 'invited@example.edu', role: 'campus_admin', campusId: 'campus-1' }, {
    restSelect: async (table) => table === 'users'
      ? { data: [] }
      : { data: [{ id: 'invite-1', email: 'invited@example.edu', campus_id: 'campus-1' }] },
    supabaseRequest: async () => { writes += 1; return { data: [] }; },
  });

  assert.equal(result.kind, 'invitation');
  assert.equal(result.created, false);
  assert.equal(writes, 0);
});
