import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessCampus, requireCampus, requireRole } from '../src/permissions.mjs';

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
