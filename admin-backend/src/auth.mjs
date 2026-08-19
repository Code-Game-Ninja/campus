import { config } from './config.mjs';
import { HttpError } from './errors.mjs';
import { restSelect, supabaseRequest } from './supabase.mjs';

const roleOrder = { super_admin: 3, campus_admin: 2, event_manager: 1 };

export async function sendOtp(email) {
  if (!email || !email.includes('@')) throw new HttpError(400, 'A valid staff email is required.', 'INVALID_EMAIL');
  await supabaseRequest('auth', 'otp', { method: 'POST', body: { email: email.trim().toLowerCase(), create_user: true } });
  return { sent: true };
}

export async function verifyOtp(email, token) {
  if (!email || !token) throw new HttpError(400, 'Email and verification code are required.', 'INVALID_OTP_REQUEST');
  const result = await supabaseRequest('auth', 'verify', { method: 'POST', body: { email: email.trim().toLowerCase(), token: token.trim(), type: 'email' } });
  if (!result.data?.access_token || !result.data?.refresh_token) throw new HttpError(502, 'Supabase did not return a valid session.', 'INVALID_AUTH_SESSION');
  try {
    const identity = await supabaseRequest('auth', 'user', { token: result.data.access_token });
    const assignments = identity.data?.id
      ? await restSelect('admin_assignments', { select: 'role,campus_id', user_id: `eq.${identity.data.id}`, status: 'eq.active', limit: 20 }, { admin: true })
      : { data: [] };
    const assignment = chooseAssignment(assignments.data || []);
    if (identity.data?.id && assignment) {
      await supabaseRequest('rest', 'audit_logs', {
        method: 'POST',
        admin: true,
        body: { actor_id: identity.data.id, action: 'admin.login', metadata: { source: 'admin-backend', admin_role: assignment.role, campus_id: assignment.campus_id || null } },
        headers: { Prefer: 'return=minimal' },
      });
    }
  } catch {
    // Authentication must remain available if audit persistence is temporarily unavailable.
  }
  return result.data;
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) throw new HttpError(401, 'Refresh token is required.', 'AUTH_REQUIRED');
  const result = await supabaseRequest('auth', 'token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: refreshToken } });
  return result.data;
}

export async function signOut(token) {
  if (!token) return;
  try { await supabaseRequest('auth', 'logout?scope=local', { method: 'POST', token }); } catch { /* local sign-out remains successful */ }
}

function chooseAssignment(rows) {
  return [...rows].sort((a, b) => (roleOrder[b.role] || 0) - (roleOrder[a.role] || 0))[0] || null;
}

async function claimInvitation(user) {
  const invite = await restSelect('admin_invitations', { select: '*', email: `eq.${user.email}`, status: 'eq.pending', limit: 1 }, { admin: true });
  const row = invite.data?.[0];
  if (!row) return null;
  const inserted = await supabaseRequest('rest', 'admin_assignments', { method: 'POST', admin: true, body: { user_id: user.id, role: row.role, campus_id: row.campus_id || null, organizer_id: row.organizer_id || null, status: 'active', granted_by: row.created_by || null }, headers: { Prefer: 'return=representation' } });
  await supabaseRequest('rest', `users?id=eq.${user.id}`, { method: 'PATCH', admin: true, body: { status: 'active' } });
  await supabaseRequest('rest', `admin_invitations?id=eq.${row.id}`, { method: 'PATCH', admin: true, body: { status: 'accepted', accepted_user_id: user.id, accepted_at: new Date().toISOString() } });
  return inserted.data?.[0] || null;
}

export async function authenticate(token) {
  if (!token) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
  const identity = await supabaseRequest('auth', 'user', { token });
  const authUser = identity.data;
  if (!authUser?.id) throw new HttpError(401, 'The access token is invalid.', 'AUTH_INVALID');
  const users = await restSelect('users', { select: 'id,email,campus_id,status', id: `eq.${authUser.id}`, limit: 1 }, { admin: true });
  const user = users.data?.[0];
  if (!user || !['pending', 'active'].includes(user.status)) throw new HttpError(403, 'This account is not active.', 'ACCOUNT_INACTIVE');
  const profiles = await restSelect('profiles', { select: 'display_name,avatar_key', user_id: `eq.${authUser.id}`, limit: 1 }, { admin: true });
  const assignmentsResult = await restSelect('admin_assignments', { select: '*', user_id: `eq.${authUser.id}`, status: 'eq.active', limit: 20 }, { admin: true });
  let assignments = assignmentsResult.data || [];
  if (!assignments.length) {
    const claimed = await claimInvitation({ id: authUser.id, email: authUser.email || user.email });
    if (claimed) assignments = [claimed];
  }
  const assignment = chooseAssignment(assignments);
  if (!assignment) throw new HttpError(403, 'This account has no active admin assignment.', 'ADMIN_ACCESS_REQUIRED');
  if (user.status === 'pending' && assignments.length) {
    await supabaseRequest('rest', `users?id=eq.${user.id}`, { method: 'PATCH', admin: true, body: { status: 'active' } });
  }
  const campuses = assignment.campus_id
    ? await restSelect('campuses', { select: 'id,name,slug,status,timezone', id: `eq.${assignment.campus_id}`, limit: 1 }, { admin: true })
    : { data: [] };
  return {
    token,
    user: { id: user.id, email: user.email || authUser.email, displayName: profiles.data?.[0]?.display_name || user.email, avatarKey: profiles.data?.[0]?.avatar_key || null },
    role: assignment.role,
    campusId: assignment.campus_id || null,
    organizerId: assignment.organizer_id || null,
    campus: campuses.data?.[0] || null,
    assignments,
  };
}

export async function authenticateUser(token) {
  if (!token) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
  const identity = await supabaseRequest('auth', 'user', { token });
  const authUser = identity.data;
  if (!authUser?.id) throw new HttpError(401, 'The access token is invalid.', 'AUTH_INVALID');
  const users = await restSelect('users', { select: 'id,email,campus_id,status', id: `eq.${authUser.id}`, limit: 1 }, { admin: true });
  const user = users.data?.[0];
  if (!user || !['pending', 'active'].includes(user.status)) throw new HttpError(403, 'This account is not active.', 'ACCOUNT_INACTIVE');
  return { token, authUser, user };
}

export function bearer(headers) {
  const value = headers.authorization || headers.Authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : null;
}

export { roleOrder };
