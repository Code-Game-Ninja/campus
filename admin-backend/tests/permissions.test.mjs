import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessCampus, requireCampus, requireRole, requireRoleGrant } from '../src/permissions.mjs';

const campus = { role: 'campus_admin', campusId: 'campus-a' };
const global = { role: 'super_admin', campusId: null };

test('campus roles remain inside their assigned campus', () => {
  assert.equal(canAccessCampus(campus, 'campus-a'), true);
  assert.equal(canAccessCampus(campus, 'campus-b'), false);
  assert.throws(() => requireCampus(campus, 'campus-b'), /outside your campus scope/);
});

test('super admins can access global campus data', () => {
  assert.equal(canAccessCampus(global, 'campus-b'), true);
  assert.doesNotThrow(() => requireCampus(global, 'campus-b'));
});

test('role checks reject unassigned actions', () => {
  assert.throws(() => requireRole(campus, ['super_admin']), /cannot perform/);
  assert.doesNotThrow(() => requireRole(campus, ['campus_admin']));
});

test('only super admins can grant elevated admin roles', () => {
  assert.doesNotThrow(() => requireRoleGrant(campus, 'event_manager'));
  assert.throws(() => requireRoleGrant(campus, 'campus_admin'), /cannot grant or revoke/);
  assert.throws(() => requireRoleGrant(campus, 'super_admin'), /cannot grant or revoke/);
  assert.doesNotThrow(() => requireRoleGrant(global, 'super_admin'));
  assert.doesNotThrow(() => requireRoleGrant(global, 'campus_admin'));
});
