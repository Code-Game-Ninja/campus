import { pathToFileURL } from 'node:url';
import { restSelect, supabaseRequest } from '../src/supabase.mjs';

const roles = ['super_admin', 'campus_admin', 'event_manager'];

function scopedFilters(campusId) {
  return { campus_id: campusId ? `eq.${campusId}` : 'is.null' };
}

export function validateGrantInput(email, role = 'super_admin', campusId = '') {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Usage: node scripts/grant-admin.mjs <email> [super_admin|campus_admin|event_manager] [campus-id]');
  }
  if (!roles.includes(role)) throw new Error('Invalid role.');
  if (role !== 'super_admin' && !campusId) throw new Error('Campus-scoped roles require a campus id.');
  return { email: normalizedEmail, role, campusId: role === 'super_admin' ? '' : campusId };
}

export async function grantAdmin(input, dependencies = {}) {
  const select = dependencies.restSelect || restSelect;
  const request = dependencies.supabaseRequest || supabaseRequest;
  const { email, role, campusId } = validateGrantInput(input.email, input.role, input.campusId);
  const scope = scopedFilters(campusId);

  const users = await select('users', { select: 'id,email,status', email: `eq.${email}`, limit: 1 }, { admin: true });
  const user = users.data?.[0];

  if (!user) {
    const pending = await select('admin_invitations', {
      select: '*', email: `eq.${email}`, role: `eq.${role}`, status: 'eq.pending', ...scope, limit: 1,
    }, { admin: true });
    if (pending.data?.[0]) return { kind: 'invitation', created: false, record: pending.data[0] };

    const invitation = await request('rest', 'admin_invitations', {
      method: 'POST',
      admin: true,
      body: { email, role, campus_id: campusId || null, status: 'pending' },
      headers: { Prefer: 'return=representation' },
    });
    return { kind: 'invitation', created: true, record: invitation.data?.[0] || invitation.data };
  }

  if (!['pending', 'active'].includes(user.status)) {
    throw new Error(`Cannot grant admin access while the user account is ${user.status}.`);
  }

  const existing = await select('admin_assignments', {
    select: '*', user_id: `eq.${user.id}`, role: `eq.${role}`, status: 'eq.active', ...scope, limit: 1,
  }, { admin: true });
  let assignment = existing.data?.[0];
  let created = false;
  if (!assignment) {
    const inserted = await request('rest', 'admin_assignments', {
      method: 'POST',
      admin: true,
      body: { user_id: user.id, role, campus_id: campusId || null, status: 'active' },
      headers: { Prefer: 'return=representation' },
    });
    assignment = inserted.data?.[0] || inserted.data;
    created = true;
  }

  if (user.status === 'pending') {
    await request('rest', `users?id=eq.${user.id}`, {
      method: 'PATCH', admin: true, body: { status: 'active' }, headers: { Prefer: 'return=representation' },
    });
  }

  return { kind: 'assignment', created, record: assignment };
}

async function main() {
  const [email, role = 'super_admin', campusId = ''] = process.argv.slice(2);
  const result = await grantAdmin({ email, role, campusId });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.kind === 'invitation') {
    process.stdout.write('The assignment will be activated automatically after this email completes its first OTP sign-in.\n');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
