import { HttpError } from './errors.mjs';

export function canAccessCampus(context, campusId) {
  return context.role === 'super_admin' || Boolean(campusId && campusId === context.campusId);
}

export function requireRole(context, roles) {
  if (!roles.includes(context.role)) throw new HttpError(403, 'Your admin role cannot perform this action.', 'PERMISSION_DENIED');
}

export function requireCampus(context, campusId) {
  if (!canAccessCampus(context, campusId)) throw new HttpError(403, 'This action is outside your campus scope.', 'SCOPE_DENIED');
}

export function requireContextCampus(context) {
  if (context.role !== 'super_admin' && !context.campusId) throw new HttpError(403, 'Your admin assignment has no campus scope.', 'SCOPE_MISSING');
}
